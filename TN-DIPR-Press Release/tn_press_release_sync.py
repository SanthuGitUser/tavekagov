"""
Fetch Tamil Nadu DIPR press releases and save one JSON file per API date.

Each day writes to Response JSON/YYYY-MM-DD.json (the `date` query param).
Re-runs merge items in `response.data` by DIPR `id` (incoming entries win).

Usage:
  1. Ensure Sync-Config/.env has TN_PRESS_RELEASE_* settings.
  2. pip install -r requirements.txt
  3. python tn_press_release_sync.py
  4. Optional: python tn_press_release_sync.py --start-date 10-05-2026 --end-date 31-07-2026
     (defaults: resume from Sync-Config/last-sync.json, end = today Asia/Kolkata)
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"

_BASE_API_URL = "https://dipr.tn.gov.in/dipr_api/v1"
_API_PATH = "general/pressReleases/press_release"
_API_URL = f"{_BASE_API_URL}/{_API_PATH}"
_KOLKATA = ZoneInfo("Asia/Kolkata")
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "X-App-Key": "dipr",
    "X-App-Name": "dipr",
}


def _load_config() -> tuple[str, str]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_press_release_source_url, get_tn_press_release_start_date

    return get_tn_press_release_source_url(), get_tn_press_release_start_date()


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-")


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _fetch_day_payload(
    session: requests.Session,
    *,
    source_url: str,
    selected_date: date,
    timeout: tuple[float, float],
) -> dict[str, Any]:
    response = session.get(
        _API_URL,
        params={"date": selected_date.isoformat()},
        timeout=timeout,
        headers={"Referer": source_url},
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict):
        return {"success": 0, "data": []}
    return payload


def merge_data_items(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    merged: dict[int, dict[str, Any]] = {}

    for item in existing:
        item_id = item.get("id")
        if item_id is not None:
            merged[int(item_id)] = item

    for item in incoming:
        item_id = item.get("id")
        if item_id is not None:
            merged[int(item_id)] = item

    results = list(merged.values())
    results.sort(key=lambda row: int(row.get("id") or 0))
    return results


def load_existing_record(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_day_response(
    output_dir: Path,
    *,
    selected_date: date,
    source_url: str,
    payload: dict[str, Any],
    fetched_at: datetime,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{selected_date.isoformat()}.json"

    incoming_data = payload.get("data")
    if not isinstance(incoming_data, list):
        incoming_data = []

    existing_record = load_existing_record(out_path)
    if not incoming_data and not existing_record:
        # Don't create empty day files; only persist when something new appears.
        return out_path
    existing_data: list[dict[str, Any]] = []
    fetch_count = 1
    first_fetched_at = fetched_at.isoformat()

    if existing_record:
        existing_response = existing_record.get("response") or {}
        raw_existing = existing_response.get("data")
        if isinstance(raw_existing, list):
            existing_data = raw_existing
        fetch_count = int(existing_record.get("fetchCount") or 0) + 1
        first_fetched_at = str(existing_record.get("fetchedAt") or first_fetched_at)

    merged_data = merge_data_items(existing_data, incoming_data)

    # Avoid touching the file when there are no new items (append-only semantics).
    # This keeps fetchedAt/lastFetchedAt stable unless the dataset actually grows.
    existing_ids = {int(item.get("id")) for item in existing_data if item.get("id") is not None}
    incoming_ids = {int(item.get("id")) for item in incoming_data if item.get("id") is not None}
    has_new_items = bool(incoming_ids - existing_ids)
    if existing_record and not has_new_items:
        return out_path

    record = {
        "date": selected_date.isoformat(),
        "fetchedAt": first_fetched_at,
        "lastFetchedAt": fetched_at.isoformat(),
        "fetchCount": fetch_count,
        "request": {
            "method": "GET",
            "url": _API_URL,
            "params": {"date": selected_date.isoformat()},
        },
        "response": {
            "success": payload.get("success", 1 if merged_data else 0),
            "data": merged_data,
        },
    }
    out_path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def sync_press_releases(
    session: requests.Session,
    *,
    source_url: str,
    output_dir: Path,
    start_date: date,
    end_date: date,
    timeout: tuple[float, float],
) -> list[Path]:
    saved_paths: list[Path] = []
    current = start_date
    total_days = (end_date - start_date).days + 1
    day_index = 0
    total_items = 0

    print(
        f"Fetching press releases from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)} ..."
    )

    while current <= end_date:
        day_index += 1
        fetched_at = datetime.now(_KOLKATA)
        payload = _fetch_day_payload(
            session,
            source_url=source_url,
            selected_date=current,
            timeout=timeout,
        )
        out_path = save_day_response(
            output_dir,
            selected_date=current,
            source_url=source_url,
            payload=payload,
            fetched_at=fetched_at,
        )
        saved_paths.append(out_path)

        day_count = len((payload.get("data") or []) if isinstance(payload.get("data"), list) else [])
        merged_count = len(
            load_existing_record(out_path).get("response", {}).get("data") or [],
        )
        total_items += day_count

        if day_count:
            print(
                f"  [{day_index}/{total_days}] {_format_display_date(current)}: "
                f"{day_count} fetched, {merged_count} saved"
            )

        time.sleep(0.15)
        current += timedelta(days=1)

    print(f"Saved {len(saved_paths)} day file(s); {total_items} item(s) fetched this run.")
    return saved_paths


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN DIPR press releases and save daily JSON responses.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for daily JSON responses (YYYY-MM-DD.json).",
    )
    parser.add_argument(
        "--start-date",
        help="Include releases from this date onward (DD-MM-YYYY). Defaults to TN_PRESS_RELEASE_START_DATE in .env.",
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
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session
    from sync_state import JOB_DIPR_PRESS_RELEASES, record_date_range_sync, resolve_date_range

    start_date, end_date = resolve_date_range(
        JOB_DIPR_PRESS_RELEASES,
        output_dir=output_dir,
        default_start_display=default_start_date,
        explicit_start=args.start_date,
        explicit_end=args.end_date,
    )
    if start_date > end_date:
        print(
            f"DIPR press releases already up to date "
            f"(through {_format_display_date(end_date)})."
        )
        return 0

    session = build_retry_session(headers=_DEFAULT_HEADERS)

    print(f"Source page: {source_url}")
    saved_paths = sync_press_releases(
        session,
        source_url=source_url,
        output_dir=output_dir,
        start_date=start_date,
        end_date=end_date,
        timeout=DEFAULT_CONNECT_READ_TIMEOUT,
    )
    if saved_paths:
        print(f"Latest file: {saved_paths[-1]}")
        record_date_range_sync(JOB_DIPR_PRESS_RELEASES, synced_through=end_date)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
