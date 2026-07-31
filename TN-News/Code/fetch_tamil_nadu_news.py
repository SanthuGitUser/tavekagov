"""
Fetch Tamil Nadu news from NewsData.io and save one JSON file per day.

Each run writes to Response JSON/YYYY-MM-DD.json (Asia/Kolkata). If the file already exists
for that day, new articles are merged in by article_id/link (incoming entries win on conflict).

API:
  https://newsdata.io/api/1/news?apikey=YOUR_API_KEY&q=Tamil+Nadu,Tamil,TVK,Tamilaga+Vettri+Kazhagam&country=in&language=en

Usage:
  1. Add NEWSDATA_API_KEY=your-key to Sync-Config/.env
  2. pip install -r requirements.txt
  3. python fetch_tamil_nadu_news.py
  4. python fetch_tamil_nadu_news.py --max-pages 3
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "Response JSON"

NEWSDATA_NEWS_URL = "https://newsdata.io/api/1/news"
DEFAULT_Q = "Tamil Nadu,Tamil,TVK,Tamilaga Vettri Kazhagam"
DEFAULT_COUNTRY = "in"
DEFAULT_LANGUAGE = "en"
KOLKATA = ZoneInfo("Asia/Kolkata")


def _load_api_key() -> str:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_newsdata_api_key

    return get_newsdata_api_key()


def fetch_page(
    api_key: str,
    params: dict[str, str],
    page: str | None = None,
    *,
    max_retries: int = 3,
    retry_delay_seconds: float = 5.0,
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


def fetch_all_pages(
    api_key: str,
    params: dict[str, str],
    *,
    max_pages: int | None = None,
    delay_seconds: float = 1.0,
) -> tuple[list[dict[str, Any]], int]:
    pages: list[dict[str, Any]] = []
    next_page: str | None = None
    total_results = 0

    while True:
        payload = fetch_page(api_key, params, page=next_page)
        pages.append(payload)
        if not total_results:
            total_results = int(payload.get("totalResults") or 0)

        next_page = payload.get("nextPage")
        if not next_page:
            break
        if max_pages is not None and len(pages) >= max_pages:
            break
        if delay_seconds > 0:
            time.sleep(delay_seconds)

    return pages, total_results


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


def build_output_filename(fetched_at: datetime) -> str:
    return f"{fetched_at.strftime('%Y-%m-%d')}.json"


def load_existing_record(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_response(
    output_dir: Path,
    requested_params: dict[str, str],
    pages: list[dict[str, Any]],
    total_results: int,
    fetched_at: datetime,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    incoming_results = merge_results(pages)
    out_path = output_dir / build_output_filename(fetched_at)

    existing_record = load_existing_record(out_path)
    existing_results: list[dict[str, Any]] = []
    fetch_count = 1
    first_fetched_at = fetched_at.isoformat()

    if existing_record:
        existing_results = existing_record.get("response", {}).get("results") or []
        fetch_count = int(existing_record.get("fetchCount") or 0) + 1
        first_fetched_at = str(existing_record.get("fetchedAt") or first_fetched_at)

    merged_results = merge_article_lists(existing_results, incoming_results)

    record = {
        "date": fetched_at.strftime("%Y-%m-%d"),
        "fetchedAt": first_fetched_at,
        "lastFetchedAt": fetched_at.isoformat(),
        "fetchCount": fetch_count,
        "request": {
            "method": "GET",
            "url": NEWSDATA_NEWS_URL,
            "params": {**requested_params, "apikey": "<redacted>"},
        },
        "response": {
            "status": "success",
            "totalResults": len(merged_results),
            "results": merged_results,
            "pagesFetched": len(pages),
        },
    }
    out_path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Tamil Nadu news from NewsData.io and save to Response JSON/.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for daily JSON responses (YYYY-MM-DD.json).",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        help="Stop after this many API pages (default: fetch all pages).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Seconds to wait between paginated requests.",
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
    }
    api_params = dict(requested_params)

    fetched_at = datetime.now(KOLKATA)

    try:
        pages, total_results = fetch_all_pages(
            api_key,
            api_params,
            max_pages=args.max_pages,
            delay_seconds=args.delay,
        )
        out_path = save_response(
            Path(args.output_dir),
            requested_params,
            pages,
            total_results,
            fetched_at,
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

    merged_count = len(load_existing_record(out_path).get("response", {}).get("results") or [])
    print(f"Saved {out_path}")
    print(f"pages fetched: {len(pages)}")
    print(f"totalResults (page 1): {total_results}")
    print(f"unique articles saved: {merged_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
