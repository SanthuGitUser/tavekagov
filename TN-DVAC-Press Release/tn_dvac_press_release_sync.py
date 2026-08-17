"""
Fetch DVAC press releases and save one JSON file per release date.

Each release date writes to Response JSON/YYYY-MM-DD.json. Re-runs merge by pdf_url.

Usage:
  1. Ensure Sync-Config/.env has TN_DVAC_PRESS_RELEASE_* settings (optional).
  2. pip install -r requirements.txt
  3. python tn_dvac_press_release_sync.py
  4. Optional: python tn_dvac_press_release_sync.py --start-date 01-05-2026 --end-date 16-08-2026
     (defaults: resume from Sync-Config/last-sync.json, end = yesterday Asia/Kolkata)
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from html import unescape
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"

_KOLKATA = ZoneInfo("Asia/Kolkata")

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}

_ANCHOR_RE = re.compile(
    r"<a[^>]+href=['\"](?P<href>[^'\"]+?\.pdf[^'\"]*)['\"][^>]*>(?P<title>.*?)</a>",
    re.IGNORECASE | re.DOTALL,
)
_DATE_IN_HREF_RE = re.compile(r"(?P<d>\d{2})-(?P<m>\d{2})-(?P<y>\d{4})")
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class DvacPressRelease:
    pdf_url: str
    release_date: str
    title: str
    file_name: str


def _load_config() -> tuple[str, str]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_dvac_press_release_source_url, get_tn_dvac_press_release_start_date

    return get_tn_dvac_press_release_source_url(), get_tn_dvac_press_release_start_date()


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-")


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _strip_html(value: str) -> str:
    cleaned = _TAG_RE.sub(" ", value)
    cleaned = unescape(cleaned)
    cleaned = _WS_RE.sub(" ", cleaned).strip()
    return cleaned


def _parse_release_date_from_href(href: str) -> date | None:
    match = _DATE_IN_HREF_RE.search(href)
    if not match:
        return None
    return date(int(match.group("y")), int(match.group("m")), int(match.group("d")))


def parse_press_release_links(html: str, *, base_url: str) -> list[DvacPressRelease]:
    releases: list[DvacPressRelease] = []
    seen: set[str] = set()

    for match in _ANCHOR_RE.finditer(html):
        raw_href = match.group("href").strip()
        if not raw_href:
            continue
        pdf_url = urljoin(base_url, raw_href)
        if pdf_url in seen:
            continue
        release_date = _parse_release_date_from_href(raw_href)
        if not release_date:
            continue
        title = _strip_html(match.group("title") or "")
        file_name = raw_href.rsplit("/", maxsplit=1)[-1]

        seen.add(pdf_url)
        releases.append(
            DvacPressRelease(
                pdf_url=pdf_url,
                release_date=release_date.isoformat(),
                title=title,
                file_name=file_name,
            )
        )

    return releases


def fetch_dvac_press_releases(
    session: requests.Session,
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> list[DvacPressRelease]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    response = session.get(
        source_url,
        timeout=DEFAULT_CONNECT_READ_TIMEOUT,
        headers={"Referer": source_url},
    )
    response.raise_for_status()

    base_url = "https://www.dvac.tn.gov.in/"
    all_releases = parse_press_release_links(response.text, base_url=base_url)
    filtered: list[DvacPressRelease] = []
    for release in all_releases:
        day = date.fromisoformat(release.release_date)
        if day < start_date or day > end_date:
            continue
        filtered.append(release)

    filtered.sort(
        key=lambda r: (r.release_date, r.pdf_url),
    )
    return filtered


def save_daily_responses(
    output_dir: Path,
    *,
    releases: list[DvacPressRelease],
    source_url: str,
) -> list[Path]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from daily_json import save_daily_json

    fetched_at = datetime.now(_KOLKATA)

    by_day: dict[date, list[dict[str, object]]] = {}
    for release in releases:
        day = date.fromisoformat(release.release_date)
        by_day.setdefault(day, []).append(asdict(release))

    saved_paths: list[Path] = []
    for day in sorted(by_day):
        saved_paths.append(
            save_daily_json(
                output_dir,
                day=day,
                items_key="releases",
                items=by_day[day],
                source_url=source_url,
                fetched_at=fetched_at,
                merge_key_fn=lambda item: str(item.get("pdf_url") or ""),
            )
        )
        time.sleep(0.05)
    return saved_paths


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch DVAC press releases and save daily JSON responses.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for daily JSON responses (YYYY-MM-DD.json).",
    )
    parser.add_argument(
        "--start-date",
        help="Include releases from this date onward (DD-MM-YYYY). Defaults to TN_DVAC_PRESS_RELEASE_START_DATE in .env.",
    )
    parser.add_argument(
        "--end-date",
        help="Include releases up to this date (DD-MM-YYYY). Defaults to yesterday (Asia/Kolkata).",
    )
    args = parser.parse_args()

    source_url, default_start_date = _load_config()
    output_dir = Path(args.output_dir)

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import build_retry_session
    from sync_state import (
        JOB_DVAC_PRESS_RELEASES,
        format_display_date,
        kolkata_today,
        record_date_range_sync,
        resolve_date_range,
    )

    yesterday = kolkata_today() - timedelta(days=1)
    explicit_end = args.end_date or format_display_date(yesterday)

    start_date, end_date = resolve_date_range(
        JOB_DVAC_PRESS_RELEASES,
        output_dir=output_dir,
        default_start_display=default_start_date,
        explicit_start=args.start_date,
        explicit_end=explicit_end,
    )
    if start_date > end_date:
        print(
            f"DVAC press releases already up to date (through {_format_display_date(end_date)})."
        )
        return 0

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    print(f"Source page: {source_url}")
    print(
        f"Fetching DVAC press releases from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)} ..."
    )

    releases = fetch_dvac_press_releases(
        session,
        source_url=source_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Found {len(releases)} release(s) in range.")

    saved_paths = save_daily_responses(
        output_dir,
        releases=releases,
        source_url=source_url,
    )
    print(f"Saved {len(saved_paths)} daily JSON file(s).")
    if saved_paths:
        print(f"Latest file: {saved_paths[-1]}")
        record_date_range_sync(JOB_DVAC_PRESS_RELEASES, synced_through=end_date)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

