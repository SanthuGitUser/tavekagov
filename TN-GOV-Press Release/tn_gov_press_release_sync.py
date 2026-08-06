"""
Fetch Tamil Nadu government press release images from tn.gov.in and save daily JSON files.

Each release date writes to Response JSON/YYYY-MM-DD.json. Re-runs merge by image_url.

Usage:
  1. pip install -r requirements.txt
  2. python tn_gov_press_release_sync.py
  3. Optional: python tn_gov_press_release_sync.py --start-date 10-05-2026 --end-date 31-07-2026
     (defaults: start from TN_GOV_PRESS_RELEASE_START_DATE in .env, end = today Asia/Kolkata)
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"
_KOLKATA = ZoneInfo("Asia/Kolkata")

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
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
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
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    all_releases: list[GovPressReleaseImage] = []
    seen_urls: set[str] = set()
    months = _iter_months(start_date, end_date)

    print(
        f"Fetching image press releases from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)} across {len(months)} month(s)..."
    )

    for index, (year, month) in enumerate(months, start=1):
        archive_url = _archive_url(base_url, year, month)
        response = session.get(
            archive_url,
            timeout=DEFAULT_CONNECT_READ_TIMEOUT,
            headers={"Referer": source_url},
        )
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


def _load_enrichment():
    script_dir = Path(__file__).resolve().parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    from tn_gov_press_release_parse_titles import (
        enrich_gov_press_release,
        load_departments_from_manifest,
        load_ministers_from_manifest,
    )

    ministers = load_ministers_from_manifest()
    departments = load_departments_from_manifest()
    return enrich_gov_press_release, ministers, departments


def _build_json_records(releases: list[GovPressReleaseImage]) -> list[dict[str, object]]:
    enrich_fn, ministers, departments = _load_enrichment()
    records: list[dict[str, object]] = []

    for release in releases:
        base = asdict(release)
        enrichment = enrich_fn(release.title, ministers=ministers, departments=departments)
        records.append({**base, **enrichment})

    return records


def _load_reference_manifests() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    ministers_path = _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json"
    departments_path = _REPO_ROOT / "TN-GOV_Departments" / "manifests" / "tn_departments.json"
    ministers_payload = json.loads(ministers_path.read_text(encoding="utf-8"))
    departments_payload = json.loads(departments_path.read_text(encoding="utf-8"))
    ministers = ministers_payload.get("ministers", [])
    departments = departments_payload.get("departments", [])
    if not isinstance(ministers, list) or not isinstance(departments, list):
        raise RuntimeError("Invalid ministers or departments manifest shape.")
    return ministers, departments


def _reference_snapshots(
    records: list[dict[str, object]],
    *,
    ministers: list[dict[str, object]],
    departments: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    minister_ids = {
        int(record["minister_id"])
        for record in records
        if record.get("minister_id") is not None
    }
    department_ids = {
        int(record["department_id"])
        for record in records
        if record.get("department_id") is not None
    }

    referenced_ministers = [
        minister
        for minister in ministers
        if isinstance(minister.get("id"), int) and minister["id"] in minister_ids
    ]
    referenced_departments = [
        department
        for department in departments
        if isinstance(department.get("id"), int) and department["id"] in department_ids
    ]

    return {
        "ministers": referenced_ministers,
        "departments": referenced_departments,
    }


def save_daily_responses(
    output_dir: Path,
    *,
    releases: list[GovPressReleaseImage],
    source_url: str,
) -> list[Path]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from daily_json import save_daily_json

    fetched_at = datetime.now(_KOLKATA)
    records = _build_json_records(releases)
    manifest_ministers, manifest_departments = _load_reference_manifests()

    by_day: dict[date, list[dict[str, object]]] = {}
    for record in records:
        day = date.fromisoformat(str(record["release_date"]))
        by_day.setdefault(day, []).append(record)

    saved_paths: list[Path] = []
    for day in sorted(by_day):
        day_records = by_day[day]
        saved_paths.append(
            save_daily_json(
                output_dir,
                day=day,
                items_key="releases",
                items=day_records,
                source_url=source_url,
                fetched_at=fetched_at,
                merge_key_fn=lambda item: str(item.get("image_url") or ""),
                extra=_reference_snapshots(
                    day_records,
                    ministers=manifest_ministers,
                    departments=manifest_departments,
                ),
            )
        )
    return saved_paths


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN government press release images and save daily JSON responses.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for daily JSON responses (YYYY-MM-DD.json).",
    )
    parser.add_argument(
        "--start-date",
        help="Include releases from this date onward (DD-MM-YYYY). Defaults to TN_GOV_PRESS_RELEASE_START_DATE.",
    )
    parser.add_argument(
        "--end-date",
        help="Include releases up to this date (DD-MM-YYYY). Defaults to today (Asia/Kolkata).",
    )
    args = parser.parse_args()

    source_url, base_url, default_start_date = _load_config()
    output_dir = Path(args.output_dir)

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session
    from sync_state import JOB_GOV_PRESS_RELEASE_IMAGES, record_date_range_sync, resolve_date_range

    start_date, end_date = resolve_date_range(
        JOB_GOV_PRESS_RELEASE_IMAGES,
        output_dir=output_dir,
        default_start_display=default_start_date,
        explicit_start=args.start_date,
        explicit_end=args.end_date,
    )
    if start_date > end_date:
        print(
            f"Gov press release images already up to date "
            f"(through {_format_display_date(end_date)})."
        )
        return 0

    session = build_retry_session(headers=_DEFAULT_HEADERS)

    print(f"Source page: {source_url}")
    releases = fetch_press_release_images(
        session,
        source_url=source_url,
        base_url=base_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Found {len(releases)} unique image press release(s).")

    saved_paths = save_daily_responses(
        output_dir,
        releases=releases,
        source_url=source_url,
    )
    print(f"Saved {len(saved_paths)} daily JSON file(s).")
    if saved_paths:
        print(f"Latest file: {saved_paths[-1]}")
        record_date_range_sync(JOB_GOV_PRESS_RELEASE_IMAGES, synced_through=end_date)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
