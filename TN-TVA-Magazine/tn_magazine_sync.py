"""
Fetch Tamil Arasu magazines from Tamil Virtual Academy Digital Library and save to JSON.

Writes a rolling catalog to manifests/magazine.json and a daily snapshot to
Response JSON/YYYY-MM-DD.json on each run.

Usage:
  1. pip install -r requirements.txt
  2. python tn_magazine_sync.py
  3. Optional: python tn_magazine_sync.py --since-date 10-05-2026
  4. Optional: python tn_magazine_sync.py --month 5 --year 2026
"""

from __future__ import annotations

import argparse
import calendar
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"
_KOLKATA = ZoneInfo("Asia/Kolkata")
_BASE_URL = "https://tamildigitallibrary.in"
_LIST_ENDPOINT = f"{_BASE_URL}/book-list-data-ajax-new"
_ARTICLE_ID_RE = re.compile(r"/Articles/(\d+)_")
_PDF_RE = re.compile(
    r'https://tamildigitallibrary\.in/assets/docs/uploads/[^"\']+\.pdf',
    re.IGNORECASE,
)
_ISSUE_DATE_RE = re.compile(
    r"\(([^,)]+),?\s*(\d{4})\)\s*$",
)
_MONTHLY_TITLE_RE = re.compile(
    r"^(?:Tamil Arasu|தமிழரசு)\s*-\s*Vol\.\s*\d+,\s*no\.\s*\d+\s*\(",
    re.IGNORECASE,
)
_MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
    "ஜனவரி": 1,
    "பிப்ரவரி": 2,
    "மார்ச்": 3,
    "ஏப்ரல்": 4,
    "மே": 5,
    "ஜூன்": 6,
    "ஜூலை": 7,
    "ஆகஸ்ட்": 8,
    "செப்டம்பர்": 9,
    "அக்டோபர்": 10,
    "நவம்பர்": 11,
    "டிசம்பர்": 12,
}
_DEFAULT_SINCE_DATE = date(2026, 5, 1)
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "X-Requested-With": "XMLHttpRequest",
}


@dataclass(frozen=True)
class Magazine:
    id: int
    name: str
    issue_date: str
    url: str


def _load_config() -> str:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tva_magazine_source_url

    return get_tva_magazine_source_url()


def _parse_issue_date(title: str) -> date | None:
    match = _ISSUE_DATE_RE.search(title.strip())
    if not match:
        return None
    month_name, year_text = match.groups()
    month_name = month_name.strip()
    if "-" in month_name:
        return None
    month = _MONTHS.get(month_name.lower()) or _MONTHS.get(month_name)
    if not month:
        return None
    return date(int(year_text), month, 1)


def _is_monthly_tamil_arasu(title: str) -> bool:
    return bool(_MONTHLY_TITLE_RE.match(title.strip()))


def _title_rank(title: str) -> int:
    """Prefer English Tamil Arasu titles over Tamil-script duplicates."""
    if title.strip().lower().startswith("tamil arasu"):
        return 0
    return 1


def _prefer_magazine(current: Magazine, candidate: Magazine) -> Magazine:
    if current.issue_date != candidate.issue_date:
        return candidate
    return current if _title_rank(current.name) <= _title_rank(candidate.name) else candidate


def _extract_article_id(detail_url: str) -> int | None:
    match = _ARTICLE_ID_RE.search(detail_url)
    if not match:
        return None
    return int(match.group(1))


def _extract_title(card: BeautifulSoup) -> str:
    for selector in ("h4", "h5", ".book-title"):
        element = card.select_one(selector)
        if element:
            text = element.get_text(" ", strip=True)
            if text:
                return text
    link = card.find("a", href=True)
    return link.get("title", "").strip() if link else ""


def _fetch_list_page(
    session: requests.Session,
    *,
    source_url: str,
    csrf: str,
    page: int,
    sorting: str,
    timeout: tuple[float, float],
) -> tuple[list[tuple[str, str]], str]:
    payload = {
        "process": "36",
        "searchtext": "",
        "author_search": "[]",
        "subject_search": "[]",
        "limit": str(page),
        "current_page": "book_search_page",
        "category": "",
        "sorting": sorting,
        "source_search": "[]",
        "language_search": "[]",
        "fformat_search": "[]",
        "resource_category_search": "[]",
        "resource_search": "[]",
        "location_of_site_search": "[]",
        "village_search": "[]",
        "ruler_search": "[]",
        "historic_period_search": "[]",
        "book_view": "grid",
        "checkval": "",
        "item_per_page": "24",
        "header_cat_id": "21",
        "header_sub_cat_id": "36",
        "header_inner_cat_id": "",
        "header_today_recommendations": "",
        "csrf_test_name": csrf,
    }
    response = session.post(
        _LIST_ENDPOINT,
        data=payload,
        headers={**_DEFAULT_HEADERS, "Referer": source_url},
        timeout=timeout,
    )
    response.raise_for_status()
    data = response.json()
    next_csrf = data.get("csrf") or csrf
    soup = BeautifulSoup(data.get("html") or "", "html.parser")
    items: list[tuple[str, str]] = []
    for card in soup.select(".book-page-border"):
        link = card.find("a", href=True)
        if not link:
            continue
        title = _extract_title(card)
        detail_url = urljoin(_BASE_URL, link["href"])
        if title:
            items.append((title, detail_url))
    return items, next_csrf


def _fetch_pdf_url(
    session: requests.Session,
    detail_url: str,
    *,
    timeout: tuple[float, float],
) -> str:
    response = session.get(detail_url, headers=_DEFAULT_HEADERS, timeout=timeout)
    response.raise_for_status()
    match = _PDF_RE.search(response.text)
    if not match:
        raise RuntimeError(f"No PDF URL found on detail page: {detail_url}")
    return match.group(0)


def fetch_magazines(
    *,
    target_month: int | None = None,
    target_year: int | None = None,
    since_date: date = _DEFAULT_SINCE_DATE,
    max_pages: int = 25,
) -> list[Magazine]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

    source_url = _load_config()
    session = build_retry_session(headers=_DEFAULT_HEADERS)
    page = session.get(source_url, headers=_DEFAULT_HEADERS, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    page.raise_for_status()
    csrf_match = re.search(r'name="csrf_test_name"\s+value="([^"]+)"', page.text)
    if not csrf_match:
        raise RuntimeError("Could not read CSRF token from Tamil Digital Library page.")
    csrf = csrf_match.group(1)

    magazines_by_month: dict[str, Magazine] = {}
    seen_ids: set[int] = set()

    for page_num in range(1, max_pages + 1):
        items, csrf = _fetch_list_page(
            session,
            source_url=source_url,
            csrf=csrf,
            page=page_num,
            sorting="pub_year DESC",
            timeout=DEFAULT_CONNECT_READ_TIMEOUT,
        )
        if not items:
            break

        for index, (title, detail_url) in enumerate(items, start=1):
            article_id = _extract_article_id(detail_url)
            if article_id is None or article_id in seen_ids:
                continue
            if not _is_monthly_tamil_arasu(title):
                continue

            issue_date = _parse_issue_date(title)
            if issue_date is None:
                print(f"  Skipping non-monthly issue: {title}")
                continue
            if target_month is not None and issue_date.month != target_month:
                continue
            if target_year is not None and issue_date.year != target_year:
                continue
            if issue_date < since_date:
                continue

            pdf_url = _fetch_pdf_url(session, detail_url, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
            magazine = Magazine(
                id=article_id,
                name=title,
                issue_date=issue_date.isoformat(),
                url=pdf_url,
            )
            month_key = magazine.issue_date[:7]
            existing = magazines_by_month.get(month_key)
            if existing is None:
                magazines_by_month[month_key] = magazine
            else:
                magazines_by_month[month_key] = _prefer_magazine(existing, magazine)
            seen_ids.add(article_id)
            print(
                f"  [page {page_num} #{index}] {title} "
                f"({calendar.month_name[issue_date.month]} {issue_date.year})"
            )
            time.sleep(0.3)

        if target_month is not None and target_year is not None and magazines_by_month:
            break

    magazines = sorted(magazines_by_month.values(), key=lambda item: item.issue_date, reverse=True)
    return magazines


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-").strip()


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _since_date_from_display(value: str) -> date:
    """Monthly issues use the first of the month; May 10 still includes the May issue."""
    parsed = _parse_display_date(value)
    return date(parsed.year, parsed.month, 1)


def _load_existing_magazines(manifest_path: Path) -> list[Magazine]:
    if not manifest_path.exists():
        return []
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    magazines = payload.get("magazines")
    if not isinstance(magazines, list):
        return []
    results: list[Magazine] = []
    for item in magazines:
        if not isinstance(item, dict):
            continue
        article_id = item.get("id")
        name = item.get("name")
        issue_date = item.get("issue_date")
        url = item.get("url")
        if article_id is None or not name or not issue_date or not url:
            continue
        results.append(
            Magazine(
                id=int(article_id),
                name=str(name),
                issue_date=str(issue_date),
                url=str(url),
            )
        )
    return results


def _merge_magazines(*groups: list[Magazine]) -> list[Magazine]:
    merged: dict[int, Magazine] = {}
    for group in groups:
        for magazine in group:
            existing = merged.get(magazine.id)
            merged[magazine.id] = _prefer_magazine(existing, magazine) if existing else magazine
    return sorted(merged.values(), key=lambda item: item.issue_date, reverse=True)


def write_manifest(magazines: list[Magazine]) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _MANIFESTS_DIR / "magazine.json"
    payload = {
        "source_url": _load_config(),
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(magazines),
        "magazines": [asdict(magazine) for magazine in magazines],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def write_daily_response(
    output_dir: Path,
    *,
    magazines: list[Magazine],
    source_url: str,
) -> Path:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from daily_json import save_daily_json

    fetched_at = datetime.now(_KOLKATA)
    today = fetched_at.date()
    records = [asdict(magazine) for magazine in magazines]

    return save_daily_json(
        output_dir,
        day=today,
        items_key="magazines",
        items=records,
        source_url=source_url,
        fetched_at=fetched_at,
        merge_key_fn=lambda item: str(item.get("id") or ""),
    )


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Fetch Tamil Arasu magazines and save JSON manifest.")
    parser.add_argument(
        "--since-date",
        help="Include issues from this date onward (DD-MM-YYYY). Defaults to 10-05-2026.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for daily JSON responses (YYYY-MM-DD.json).",
    )
    parser.add_argument(
        "--month",
        type=int,
        default=None,
        help="Optional filter to a specific issue month.",
    )
    parser.add_argument(
        "--year",
        type=int,
        default=None,
        help="Optional filter to a specific issue year.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=25,
        help="Maximum list pages to scan (24 issues per page).",
    )
    args = parser.parse_args()

    if (args.month is None) ^ (args.year is None):
        parser.error("Pass both --month and --year to filter to a single issue month.")

    source_url = _load_config()
    since_date = (
        _since_date_from_display(args.since_date)
        if args.since_date
        else _DEFAULT_SINCE_DATE
    )
    manifest_path = _MANIFESTS_DIR / "magazine.json"
    existing = _load_existing_magazines(manifest_path)

    print(f"Fetching Tamil Arasu magazines from {source_url} ...")
    print(f"Including issues since {since_date.isoformat()} ...")
    fetched = fetch_magazines(
        target_month=args.month,
        target_year=args.year,
        since_date=since_date,
        max_pages=args.max_pages,
    )
    magazines = _merge_magazines(existing, fetched)
    if not magazines:
        label = ""
        if args.month and args.year:
            label = f" for {calendar.month_name[args.month]} {args.year}"
        raise RuntimeError(f"No Tamil Arasu magazines found{label}.")
    print(f"Parsed {len(magazines)} magazine issue(s).")

    manifest_path = write_manifest(magazines)
    daily_path = write_daily_response(
        Path(args.output_dir),
        magazines=magazines,
        source_url=source_url,
    )
    print(f"Wrote manifest: {manifest_path}")
    print(f"Wrote daily JSON: {daily_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
