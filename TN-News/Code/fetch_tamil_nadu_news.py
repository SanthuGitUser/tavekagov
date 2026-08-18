"""
Fetch Tamil Nadu news from NewsData.io and save one JSON file per publication day.

Each article is stored in Response JSON/YYYY-MM-DD.json where the date is the
article's publication calendar day in Asia/Kolkata (matching the web dashboard).
Re-runs merge by article_id/link (incoming entries win on conflict).

NewsData.io free plan: 30 API credits per 15 minutes. This script fetches in
batches of 30 page requests, waits 15 minutes, then continues via nextPage until
all results are retrieved.

API:
  https://newsdata.io/api/1/news?apikey=YOUR_API_KEY&q=Tamil+Nadu&country=in&language=en&domainurl=news9live.com%2Cfrontline.thehindu.com%2Cthenewsminute.com%2Ctimesnownews.com&category=crime%2Cbusiness%2Cpolitics%2Ceducation%2Cenvironment

Usage:
  1. Add NEWSDATA_API_KEY=your-key to Sync-Config/.env
  2. pip install -r requirements.txt
  3. python fetch_tamil_nadu_news.py
  4. python fetch_tamil_nadu_news.py --max-pages 3
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Callable
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "Response JSON"

NEWSDATA_NEWS_URL = "https://newsdata.io/api/1/news"
DEFAULT_Q = "Tamil Nadu"
DEFAULT_COUNTRY = "in"
DEFAULT_LANGUAGE = "en"
DEFAULT_DOMAINURL = (
    "news9live.com,frontline.thehindu.com,thenewsminute.com,timesnownews.com"
)
DEFAULT_CATEGORY = "crime,business,politics,education,environment"
# NewsData.io free plan: 30 credits per 15-minute window (1 credit per API call).
CREDITS_PER_WINDOW = 30
WINDOW_PAUSE_SECONDS = 15 * 60
RESULTS_PER_PAGE = 10
KOLKATA = ZoneInfo("Asia/Kolkata")
_OFFSET_RE = re.compile(r"[+-]\d{2}:\d{2}$")


def _load_api_key() -> str:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_newsdata_api_key

    return get_newsdata_api_key()


def parse_news_datetime(value: str, timezone: str = "UTC") -> datetime:
    """Parse NewsData.io pubDate using its declared timezone (mirrors newsDateUtils.ts)."""
    normalized = value if "T" in value else value.replace(" ", "T")
    has_offset = normalized.endswith("Z") or bool(_OFFSET_RE.search(normalized))

    if has_offset:
        return datetime.fromisoformat(normalized.replace("Z", "+00:00"))

    if timezone.upper() == "UTC":
        return datetime.fromisoformat(normalized).replace(tzinfo=ZoneInfo("UTC"))

    return datetime.fromisoformat(normalized).replace(tzinfo=ZoneInfo("UTC"))


def get_article_date_in_ist(article: dict[str, Any]) -> str | None:
    pub_date = str(article.get("pubDate") or "").strip()
    if not pub_date:
        return None

    timezone = str(article.get("pubDateTZ") or "UTC").strip() or "UTC"
    try:
        parsed = parse_news_datetime(pub_date, timezone)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=ZoneInfo("UTC"))
        return parsed.astimezone(KOLKATA).strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        return None


def fetch_page(
    api_key: str,
    params: dict[str, str],
    page: str | None = None,
    *,
    max_retries: int = 5,
    retry_delay_seconds: float = 10.0,
) -> dict[str, Any]:
    query = {**params, "apikey": api_key}
    if page:
        query["page"] = page

    last_response: requests.Response | None = None
    for attempt in range(max_retries + 1):
        last_response = requests.get(NEWSDATA_NEWS_URL, params=query, timeout=60)
        if last_response.status_code == 429 and attempt < max_retries:
            time.sleep(retry_delay_seconds * (attempt + 1))
            continue
        last_response.raise_for_status()
        payload = last_response.json()
        if payload.get("status") == "error":
            raise RuntimeError(json.dumps(payload, ensure_ascii=False))
        return payload

    raise requests.HTTPError("Rate limit retries exhausted", response=last_response)


def _normalize_next_page(value: Any) -> str | None:
    if value is None:
        return None
    token = str(value).strip()
    if not token or token.lower() in {"null", "none"}:
        return None
    return token


def estimated_page_count(total_results: int) -> int:
    """Pages needed to cover API totalResults (10 results per page)."""
    if total_results <= 0:
        return 0
    return (total_results + RESULTS_PER_PAGE - 1) // RESULTS_PER_PAGE


def estimated_batch_count(page_count: int, *, credits_per_window: int) -> int:
    if page_count <= 0:
        return 0
    return (page_count + credits_per_window - 1) // credits_per_window


def estimated_run_minutes(
    total_results: int,
    *,
    credits_per_window: int = CREDITS_PER_WINDOW,
    window_pause_seconds: int = WINDOW_PAUSE_SECONDS,
    delay_seconds: float = 1.0,
) -> int:
    """Rough runtime for batched pagination (for logging / CI timeout planning)."""
    pages = estimated_page_count(total_results)
    batches = estimated_batch_count(pages, credits_per_window=credits_per_window)
    pause_minutes = max(0, batches - 1) * (window_pause_seconds / 60)
    fetch_minutes = pages * max(delay_seconds, 0) / 60
    return max(1, int(pause_minutes + fetch_minutes + 1))


def _count_page_unique(
    page_results: list[dict[str, Any]],
    unique_seen: set[str],
) -> int:
    page_unique = 0
    for article in page_results:
        key = str(article.get("article_id") or article.get("link") or "")
        if key and key not in unique_seen:
            unique_seen.add(key)
            page_unique += 1
    return page_unique


def fetch_all_pages(
    api_key: str,
    params: dict[str, str],
    *,
    max_pages: int | None = None,
    max_api_calls: int | None = None,
    credits_per_window: int = CREDITS_PER_WINDOW,
    window_pause_seconds: int = WINDOW_PAUSE_SECONDS,
    delay_seconds: float = 1.0,
    on_batch_saved: Callable[[list[dict[str, Any]], int, int], None] | None = None,
) -> tuple[list[dict[str, Any]], int, int, bool, bool]:
    """Fetch every API page in batched windows until nextPage ends.

    Pagination follows the API's nextPage token — no fixed article count.
    totalResults from page 1 is used only for progress estimates.

    Returns (pages, totalResults, api_calls_made, rate_limited, incomplete).
    """
    pages: list[dict[str, Any]] = []
    next_page: str | None = None
    total_results = 0
    estimated_pages = 0
    unique_seen: set[str] = set()
    rate_limited = False
    incomplete = False
    calls_in_window = 0
    batch_number = 0

    while True:
        if max_api_calls is not None and len(pages) >= max_api_calls:
            incomplete = True
            print(
                f"Stopping: reached max API calls ({max_api_calls}) "
                f"before exhausting nextPage.",
                file=sys.stderr,
            )
            break

        page_number = len(pages) + 1
        try:
            payload = fetch_page(api_key, params, page=next_page)
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 429 and pages:
                rate_limited = True
                incomplete = True
                print(
                    f"Rate limit hit after {len(pages)} page(s); "
                    f"saving {len(unique_seen)} unique article(s) fetched so far.",
                    file=sys.stderr,
                )
                break
            raise

        pages.append(payload)
        calls_in_window += 1

        if not total_results:
            total_results = int(payload.get("totalResults") or 0)
            estimated_pages = max(1, estimated_page_count(total_results))
            run_minutes = estimated_run_minutes(
                total_results,
                credits_per_window=credits_per_window,
                window_pause_seconds=window_pause_seconds,
                delay_seconds=delay_seconds,
            )
            print(
                f"API totalResults={total_results} "
                f"(~{estimated_pages} page(s), ~{run_minutes} min estimated runtime)."
            )

        page_results = payload.get("results") or []
        page_unique = _count_page_unique(page_results, unique_seen)
        cumulative_unique = len(unique_seen)
        progress_denominator = estimated_pages if estimated_pages else page_number
        print(
            f"  Page {page_number}/{progress_denominator} "
            f"(batch {batch_number + 1}, call {calls_in_window}/{credits_per_window}): "
            f"{len(page_results)} result(s), "
            f"{page_unique} new unique, "
            f"{cumulative_unique} unique fetched"
            + (f" (API totalResults={total_results})" if total_results else "")
        )

        next_page = _normalize_next_page(payload.get("nextPage"))
        if not next_page:
            break
        if max_pages is not None and len(pages) >= max_pages:
            incomplete = True
            print(f"Stopping: reached --max-pages {max_pages}.", file=sys.stderr)
            break

        if calls_in_window >= credits_per_window:
            batch_number += 1
            if on_batch_saved:
                on_batch_saved(pages, len(pages), total_results)
            print(
                f"Batch {batch_number} complete ({credits_per_window} API calls). "
                f"Waiting {window_pause_seconds // 60} minutes for the next rate-limit window ..."
            )
            time.sleep(window_pause_seconds)
            calls_in_window = 0
            continue

        if delay_seconds > 0:
            time.sleep(delay_seconds)

    return pages, total_results, len(pages), rate_limited, incomplete


def merge_results(pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []

    for page in pages:
        for article in page.get("results") or []:
            article_id = str(article.get("article_id") or "")
            link = str(article.get("link") or "")
            key = article_id or link
            if not key or key in seen:
                continue
            seen.add(key)
            merged.append(article)

    return merged


def merge_article_lists(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}

    for article in existing:
        key = str(article.get("article_id") or article.get("link") or "")
        if key:
            merged[key] = article

    for article in incoming:
        key = str(article.get("article_id") or article.get("link") or "")
        if key:
            merged[key] = article

    results = list(merged.values())
    results.sort(key=lambda article: str(article.get("pubDate") or ""), reverse=True)
    return results


def bucket_articles_by_pub_date(
    articles: list[dict[str, Any]],
) -> tuple[dict[str, list[dict[str, Any]]], int]:
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)
    skipped = 0

    for article in articles:
        pub_date = get_article_date_in_ist(article)
        if not pub_date:
            skipped += 1
            continue
        buckets[pub_date].append(article)

    return dict(buckets), skipped


def build_output_filename(pub_date: str) -> str:
    return f"{pub_date}.json"


def load_existing_record(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_day_response(
    output_dir: Path,
    *,
    pub_date: str,
    requested_params: dict[str, str],
    incoming_results: list[dict[str, Any]],
    pages_fetched: int,
    fetched_at: datetime,
    api_total_results: int,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / build_output_filename(pub_date)

    existing_record = load_existing_record(out_path)
    existing_results: list[dict[str, Any]] = []
    fetch_count = 1
    first_fetched_at = fetched_at.isoformat()

    if existing_record:
        existing_results = existing_record.get("response", {}).get("results") or []
        fetch_count = int(existing_record.get("fetchCount") or 0) + 1
        first_fetched_at = str(existing_record.get("fetchedAt") or first_fetched_at)

    merged_results = merge_article_lists(existing_results, incoming_results)

    # Avoid touching the file when there are no new articles (append-only semantics).
    def _key(article: dict[str, Any]) -> str:
        return str(article.get("article_id") or article.get("link") or "").strip()

    existing_keys = {_key(a) for a in existing_results if isinstance(a, dict) and _key(a)}
    incoming_keys = {_key(a) for a in incoming_results if isinstance(a, dict) and _key(a)}
    has_new_items = bool(incoming_keys - existing_keys)
    if existing_record and not has_new_items:
        return out_path

    record = {
        "date": pub_date,
        "fetchedAt": first_fetched_at,
        "lastFetchedAt": fetched_at.isoformat(),
        "fetchCount": fetch_count,
        "request": {
            "method": "GET",
            "url": NEWSDATA_NEWS_URL,
            "params": requested_params,
        },
        "response": {
            "status": "success",
            "totalResults": len(merged_results),
            "apiReportedTotalResults": api_total_results,
            "results": merged_results,
            "pagesFetched": pages_fetched,
        },
    }
    out_path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def save_responses_by_pub_date(
    output_dir: Path,
    requested_params: dict[str, str],
    pages: list[dict[str, Any]],
    fetched_at: datetime,
    *,
    api_total_results: int,
    api_calls_made: int,
) -> tuple[list[Path], int, int]:
    incoming_results = merge_results(pages)
    buckets, skipped = bucket_articles_by_pub_date(incoming_results)
    saved_paths: list[Path] = []

    for pub_date in sorted(buckets):
        saved_paths.append(
            save_day_response(
                output_dir,
                pub_date=pub_date,
                requested_params=requested_params,
                incoming_results=buckets[pub_date],
                pages_fetched=api_calls_made,
                fetched_at=fetched_at,
                api_total_results=api_total_results,
            )
        )

    if saved_paths:
        print(
            f"Saved checkpoint: API totalResults={api_total_results}; "
            f"unique articles in run so far={len(incoming_results)} "
            f"across {len(saved_paths)} publication-day file(s)."
        )

    return saved_paths, len(incoming_results), skipped


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Tamil Nadu news from NewsData.io and save to Response JSON/.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for publication-day JSON responses (YYYY-MM-DD.json, IST).",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Stop after this many API pages (default: fetch all pages until nextPage ends).",
    )
    parser.add_argument(
        "--max-api-calls",
        type=int,
        default=None,
        help=(
            "Optional cap on API calls per run (default: no cap — paginate until "
            "nextPage ends)."
        ),
    )
    parser.add_argument(
        "--credits-per-window",
        type=int,
        default=CREDITS_PER_WINDOW,
        help=f"API calls before pausing for the rate-limit window (default: {CREDITS_PER_WINDOW}).",
    )
    parser.add_argument(
        "--window-pause-seconds",
        type=int,
        default=WINDOW_PAUSE_SECONDS,
        help=f"Seconds to wait between batches (default: {WINDOW_PAUSE_SECONDS}).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Seconds to wait between API calls within a batch (default: 1.0).",
    )
    args = parser.parse_args()

    try:
        api_key = _load_api_key()
    except ValueError as exc:
        print(exc, file=sys.stderr)
        return 1

    requested_params = {
        "q": DEFAULT_Q,
        "country": DEFAULT_COUNTRY,
        "language": DEFAULT_LANGUAGE,
        "domainurl": DEFAULT_DOMAINURL,
        "category": DEFAULT_CATEGORY,
    }
    api_params = dict(requested_params)
    output_dir = Path(args.output_dir)
    fetched_at = datetime.now(KOLKATA)

    print(
        f"Fetching news (q={requested_params['q']!r}, "
        f"domains={requested_params['domainurl']!r}, "
        f"batch={args.credits_per_window} calls then {args.window_pause_seconds // 60} min pause, "
        f"paginate until nextPage ends) ..."
    )

    def save_checkpoint(pages: list[dict[str, Any]], api_calls: int, total_results: int) -> None:
        save_responses_by_pub_date(
            output_dir,
            requested_params,
            pages,
            fetched_at,
            api_total_results=total_results,
            api_calls_made=api_calls,
        )

    try:
        pages, total_results, api_calls_made, rate_limited, incomplete = fetch_all_pages(
            api_key,
            api_params,
            max_pages=args.max_pages,
            max_api_calls=args.max_api_calls,
            credits_per_window=args.credits_per_window,
            window_pause_seconds=args.window_pause_seconds,
            delay_seconds=args.delay,
            on_batch_saved=save_checkpoint,
        )
        if not pages:
            print("No API pages fetched.", file=sys.stderr)
            return 1

        saved_paths, incoming_count, skipped = save_responses_by_pub_date(
            output_dir,
            requested_params,
            pages,
            fetched_at,
            api_total_results=total_results,
            api_calls_made=api_calls_made,
        )
    except requests.HTTPError as exc:
        print(f"NewsData.io request failed: {exc}", file=sys.stderr)
        if exc.response is not None:
            print(exc.response.text, file=sys.stderr)
        return 1
    except requests.RequestException as exc:
        print(f"Network error: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    saved_article_count = 0
    for path in saved_paths:
        saved_article_count += len(
            load_existing_record(path).get("response", {}).get("results") or [],
        )

    print(f"Saved {len(saved_paths)} publication-day file(s).")
    for path in saved_paths:
        day_count = len(load_existing_record(path).get("response", {}).get("results") or [])
        print(f"  {path.name}: {day_count} article(s)")
    print(f"API calls made: {api_calls_made}")
    print(f"API pages fetched: {len(pages)}")
    print(f"totalResults (API page 1): {total_results}")
    print(f"unique articles fetched this run: {incoming_count}")
    print(f"unique articles saved across touched files: {saved_article_count}")
    if total_results:
        expected_pages = estimated_page_count(total_results)
        print(
            f"pagination: fetched {len(pages)}/{expected_pages} estimated page(s) "
            f"for API totalResults={total_results}"
        )
    if skipped:
        print(f"skipped (missing/invalid pubDate): {skipped}")
    if rate_limited or incomplete:
        print(
            "Warning: fetch did not exhaust all nextPage tokens. Partial results were saved.",
            file=sys.stderr,
        )
    elif total_results and incoming_count < total_results:
        print(
            f"Note: fetched {incoming_count} unique articles; API reported totalResults="
            f"{total_results}. The API index can exceed deliverable unique pages.",
        )

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from sync_state import JOB_NEWS, find_latest_iso_json_date, record_date_range_sync, record_sync

    latest_pub_date = find_latest_iso_json_date(output_dir)
    if latest_pub_date:
        record_date_range_sync(JOB_NEWS, synced_through=latest_pub_date)
    else:
        record_sync(JOB_NEWS)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
