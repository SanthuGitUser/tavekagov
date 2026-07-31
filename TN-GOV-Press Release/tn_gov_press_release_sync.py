"""
Fetch Tamil Nadu government press release images from tn.gov.in and upsert into Supabase.

The portal lists recent releases on press_release.php and older items in monthly archives
at press_release_archieves.php.

Usage:
  1. Ensure Public DB/.env has Supabase keys and TN_GOV_PRESS_RELEASE_* settings.
  2. pip install -r requirements.txt
  3. python tn_gov_press_release_sync.py
  4. Optional: python tn_gov_press_release_sync.py --dry-run
  5. Optional: python tn_gov_press_release_sync.py --start-date 10-05-2026 --end-date 29-07-2026
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlsplit

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

_ITEM_RE = re.compile(
    r"<li class='list-group-item pr-list-group-item clearfix'>(.*?)</li>",
    re.IGNORECASE | re.DOTALL,
)
_IMAGE_SRC_RE = re.compile(r"src=['\"]([^'\"]+)['\"]", re.IGNORECASE)
_TITLE_RE = re.compile(r"class='list-group-item-text'>([^<]+)</p>", re.IGNORECASE)
_DATE_RE = re.compile(r"class='tag-label'>([^<]+)<", re.IGNORECASE)
_IMAGE_EXT_RE = re.compile(r"\.(?:jpg|jpeg|png|gif)(?:\?|$)", re.IGNORECASE)
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


@dataclass(frozen=True)
class GovPressReleaseImage:
    image_url: str
    release_date: str
    title: str
    file_name: str


def _load_config() -> tuple[str, str, str]:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import (
        get_tn_gov_base_url,
        get_tn_gov_press_release_source_url,
        get_tn_gov_press_release_start_date,
    )

    return (
        get_tn_gov_press_release_source_url(),
        get_tn_gov_base_url(),
        get_tn_gov_press_release_start_date(),
    )


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-")


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _parse_release_date_label(value: str) -> date:
    cleaned = unescape(value)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = cleaned.replace(" ,", ",").replace(", ", " ")
    cleaned = cleaned.replace(",", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return datetime.strptime(cleaned, "%B %d %Y").date()


def _encode_year(year: int) -> str:
    return base64.b64encode(str(year).encode("utf-8")).decode("utf-8")


def _encode_month(month: int) -> str:
    return base64.b64encode(f"{month:02d}".encode("utf-8")).decode("utf-8")


def _archive_url(base_url: str, year: int, month: int) -> str:
    return urljoin(
        base_url,
        "press_release_archieves.php"
        f"?field_press_date_value={_encode_year(year)}"
        f"&field_press_month_value={_encode_month(month)}",
    )


def _file_name_from_url(image_url: str) -> str:
    return urlsplit(image_url).path.rsplit("/", maxsplit=1)[-1]


def _is_press_release_image(url: str) -> bool:
    lowered = url.lower()
    return (
        "cms.tn.gov.in" in lowered
        and "press_release" in lowered
        and not lowered.endswith("pdf_img1.png")
        and bool(_IMAGE_EXT_RE.search(lowered))
    )


def parse_press_release_images(html: str) -> list[GovPressReleaseImage]:
    releases: list[GovPressReleaseImage] = []
    seen_urls: set[str] = set()

    for chunk in _ITEM_RE.findall(html):
        image_urls = [
            url.strip()
            for url in _IMAGE_SRC_RE.findall(chunk)
            if _is_press_release_image(url.strip())
        ]
        if not image_urls:
            continue

        title_match = _TITLE_RE.search(chunk)
        date_match = _DATE_RE.search(chunk)
        title = (
            unescape(re.sub(r"\s+", " ", title_match.group(1))).strip()
            if title_match
            else ""
        )
        release_date = (
            _parse_release_date_label(date_match.group(1)).isoformat()
            if date_match
            else ""
        )
        if not release_date:
            continue

        for image_url in image_urls:
            if image_url in seen_urls:
                continue
            seen_urls.add(image_url)
            releases.append(
                GovPressReleaseImage(
                    image_url=image_url,
                    release_date=release_date,
                    title=title,
                    file_name=_file_name_from_url(image_url),
                )
            )

    return releases


def _iter_months(start_date: date, end_date: date) -> list[tuple[int, int]]:
    months: list[tuple[int, int]] = []
    year, month = start_date.year, start_date.month
    while (year, month) <= (end_date.year, end_date.month):
        months.append((year, month))
        month += 1
        if month > 12:
            month = 1
            year += 1
    return months


def fetch_press_release_images(
    session: requests.Session,
    *,
    source_url: str,
    base_url: str,
    start_date: date,
    end_date: date,
) -> list[GovPressReleaseImage]:
    all_releases: list[GovPressReleaseImage] = []
    seen_urls: set[str] = set()
    months = _iter_months(start_date, end_date)

    print(
        f"Fetching image press releases from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)} across {len(months)} month(s)..."
    )

    for index, (year, month) in enumerate(months, start=1):
        archive_url = _archive_url(base_url, year, month)
        response = session.get(archive_url, timeout=(20, 120), headers={"Referer": source_url})
        response.raise_for_status()
        month_releases = parse_press_release_images(response.text)

        unique_month_releases: list[GovPressReleaseImage] = []
        for release in month_releases:
            release_date = date.fromisoformat(release.release_date)
            if release_date < start_date or release_date > end_date:
                continue
            if release.image_url in seen_urls:
                continue
            seen_urls.add(release.image_url)
            unique_month_releases.append(release)

        print(
            f"  [{index}/{len(months)}] {year}-{month:02d}: "
            f"{len(unique_month_releases)} image release(s)"
        )
        all_releases.extend(unique_month_releases)
        time.sleep(0.3)

    return all_releases


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_press_release_images(releases: list[GovPressReleaseImage]) -> int:
    if not releases:
        return 0

    client = _load_supabase_client()
    rows = [asdict(release) for release in releases]
    client.table("tn_gov_press_releases").upsert(rows, on_conflict="image_url").execute()
    return len(rows)


def write_manifest(
    releases: list[GovPressReleaseImage],
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    safe_start = _format_display_date(start_date).replace("-", "")
    safe_end = _format_display_date(end_date).replace("-", "")
    path = _MANIFESTS_DIR / f"tn_gov_press_releases_{safe_start}_to_{safe_end}.json"
    payload = {
        "source_url": source_url,
        "start_date": _format_display_date(start_date),
        "end_date": _format_display_date(end_date),
        "count": len(releases),
        "releases": [asdict(release) for release in releases],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync TN government press release images to Supabase.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    parser.add_argument(
        "--start-date",
        help="Include releases from this date onward (DD-MM-YYYY). Defaults to TN_GOV_PRESS_RELEASE_START_DATE.",
    )
    parser.add_argument(
        "--end-date",
        help="Include releases up to this date (DD-MM-YYYY). Defaults to today.",
    )
    args = parser.parse_args()

    source_url, base_url, default_start_date = _load_config()
    start_date = _parse_display_date(_normalize_date(args.start_date or default_start_date))
    end_date = _parse_display_date(_normalize_date(args.end_date)) if args.end_date else date.today()
    if start_date > end_date:
        raise SystemExit("start-date must be on or before end-date.")

    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)

    print(f"Source page: {source_url}")
    releases = fetch_press_release_images(
        session,
        source_url=source_url,
        base_url=base_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Found {len(releases)} unique image press release(s).")

    manifest_path = write_manifest(
        releases,
        source_url=source_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Wrote manifest: {manifest_path}")

    if args.dry_run:
        print("Dry run complete (no database changes).")
        return 0

    count = upsert_press_release_images(releases)
    print(f"Upserted {count} row(s) into public.tn_gov_press_releases.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
