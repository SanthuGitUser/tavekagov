"""
Fetch Tamil Nadu news from NewsData.io for selected domains and save a timestamped JSON file.

API:
  https://newsdata.io/api/1/news?apikey=YOUR_API_KEY&q=Tamil+Nadu&country=in
  &language=en&timezone=Asia/Kolkata&domain=thenewsminute.com,timesnownews.com

Usage:
  1. Add NEWSDATA_API_KEY=your-key to Public DB/.env
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
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "Response JSON"

NEWSDATA_NEWS_URL = "https://newsdata.io/api/1/news"
DEFAULT_DOMAINS = "thenewsminute.com,timesnownews.com"
KOLKATA = ZoneInfo("Asia/Kolkata")


def _load_api_key() -> str:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import get_newsdata_api_key

    return get_newsdata_api_key()


def _apply_domain_param(params: dict[str, str], domains: str) -> None:
    value = ",".join(part.strip() for part in domains.split(",") if part.strip())
    if any("." in part for part in value.split(",")):
        params["domainurl"] = value
    else:
        params["domain"] = value


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


def build_output_filename(fetched_at: datetime) -> str:
    stamp = fetched_at.strftime("%Y-%m-%d_%H-%M-%S")
    return f"{stamp}.json"


def save_response(
    output_dir: Path,
    requested_params: dict[str, str],
    pages: list[dict[str, Any]],
    total_results: int,
    fetched_at: datetime,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    merged_results = merge_results(pages)
    out_path = output_dir / build_output_filename(fetched_at)

    record = {
        "fetchedAt": fetched_at.isoformat(),
        "request": {
            "method": "GET",
            "url": NEWSDATA_NEWS_URL,
            "params": {**requested_params, "apikey": "<redacted>"},
        },
        "response": {
            "status": "success",
            "totalResults": total_results,
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
    parser.add_argument("--q", default="Tamil Nadu", help="Search query.")
    parser.add_argument("--country", default="in", help="Country filter.")
    parser.add_argument("--language", default="en", help="Language filter.")
    parser.add_argument("--timezone", default="Asia/Kolkata", help="Timezone for pubDate.")
    parser.add_argument("--domain", default=DEFAULT_DOMAINS, help="Comma-separated domain filter.")
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for timestamped JSON responses.",
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
        "q": args.q,
        "country": args.country,
        "language": args.language,
        "timezone": args.timezone,
        "domain": args.domain,
    }
    api_params = {
        "q": args.q,
        "country": args.country,
        "language": args.language,
        "timezone": args.timezone,
    }
    _apply_domain_param(api_params, args.domain)

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

    merged_count = len(merge_results(pages))
    print(f"Saved {out_path}")
    print(f"pages fetched: {len(pages)}")
    print(f"totalResults (page 1): {total_results}")
    print(f"unique articles saved: {merged_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
