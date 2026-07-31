"""
Fetch Tamil Nadu DIPR press releases and upsert into Supabase.

Usage:
  1. Ensure Public DB/.env has Supabase keys and TN_PRESS_RELEASE_* settings.
  2. pip install -r requirements.txt
  3. python tn_press_release_sync.py
  4. Optional: python tn_press_release_sync.py --dry-run
  5. Optional: python tn_press_release_sync.py --start-date 10-05-2026 --end-date 21-07-2026
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

_BASE_API_URL = "https://dipr.tn.gov.in/dipr_api/v1"
_API_ENDPOINT = "press_release"
_PDF_SUFFIX_RE = re.compile(r"\.pdf\s*$", re.I)
_PR_NO_RE = re.compile(
    r"DIPR[-\s]*(?:P\.?\s*R\.?|PR)[_\s\.-]*No\.?\s*[_\s\.-]*(\d+)",
    re.IGNORECASE,
)
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "X-App-Key": "dipr",
    "X-App-Name": "dipr",
}


@dataclass(frozen=True)
class PressRelease:
    id: int
    name: str
    pr_date: str
    dipr_pr_no: str | None
    pdf_url: str


def _load_config() -> tuple[str, str]:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import get_tn_press_release_source_url, get_tn_press_release_start_date

    return get_tn_press_release_source_url(), get_tn_press_release_start_date()


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-")


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _safe_url(url: str) -> str:
    parts = urlsplit(url)
    path = quote(unquote(parts.path), safe="/-_.~()")
    query = quote(unquote(parts.query), safe="=&-_.~%")
    return urlunsplit((parts.scheme, parts.netloc, path, query, parts.fragment))


def _join_base_api(file_path_or_url: str) -> str:
    raw = (file_path_or_url or "").strip()
    if not raw:
        return ""
    if raw.lower().startswith("http://") or raw.lower().startswith("https://"):
        return _safe_url(raw)
    if not raw.startswith("/"):
        raw = "/" + raw
    return _safe_url(_BASE_API_URL.rstrip("/") + raw)


def _item_title(item: dict[str, Any]) -> str:
    return (
        item.get("press_name")
        or item.get("press_note_name")
        or item.get("title")
        or item.get("name")
        or "Untitled"
    )


def _item_file_field(item: dict[str, Any]) -> str:
    for key in ("press_file_name", "press_note_file_name"):
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    for key, value in item.items():
        if not isinstance(key, str) or not key.endswith("_file_name"):
            continue
        if isinstance(value, str) and value.strip().lower().endswith(".pdf"):
            return value.strip()
    return ""


def _extract_pr_no(item: dict[str, Any], name: str) -> str | None:
    raw = item.get("press_release_no")
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    for source in (name, _item_file_field(item)):
        match = _PR_NO_RE.search(source)
        if match:
            return match.group(1)
    return None


def _parse_item(item: dict[str, Any]) -> PressRelease | None:
    item_id = item.get("id")
    if item_id is None:
        return None

    file_ref = _item_file_field(item)
    pdf_url = _join_base_api(file_ref)
    if not pdf_url:
        return None

    raw_name = _PDF_SUFFIX_RE.sub("", _item_title(item)).strip()
    pr_date_raw = item.get("pr_date") or item.get("uploaded_date")
    if not isinstance(pr_date_raw, str) or not pr_date_raw.strip():
        return None

    return PressRelease(
        id=int(item_id),
        name=raw_name,
        pr_date=pr_date_raw.strip(),
        dipr_pr_no=_extract_pr_no(item, raw_name),
        pdf_url=pdf_url,
    )


def _fetch_day(
    session: requests.Session,
    *,
    source_url: str,
    selected_date: date,
) -> list[PressRelease]:
    response = session.get(
        f"{_BASE_API_URL}/general/pressReleases/{_API_ENDPOINT}",
        params={"date": selected_date.isoformat()},
        timeout=(20, 120),
        headers={"Referer": source_url},
    )
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or payload.get("success") != 1:
        return []

    data = payload.get("data")
    if not isinstance(data, list):
        return []

    releases: list[PressRelease] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        parsed = _parse_item(item)
        if parsed is not None:
            releases.append(parsed)
    return releases


def fetch_press_releases(
    session: requests.Session,
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> list[PressRelease]:
    releases: list[PressRelease] = []
    seen_ids: set[int] = set()
    current = start_date
    total_days = (end_date - start_date).days + 1
    day_index = 0

    print(
        f"Fetching press releases from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)} ..."
    )
    while current <= end_date:
        day_index += 1
        day_items = _fetch_day(session, source_url=source_url, selected_date=current)
        new_count = 0
        for item in day_items:
            if item.id in seen_ids:
                continue
            seen_ids.add(item.id)
            releases.append(item)
            new_count += 1

        if new_count:
            print(
                f"  [{day_index}/{total_days}] {_format_display_date(current)}: "
                f"{new_count} release(s)"
            )
        time.sleep(0.15)
        current += timedelta(days=1)

    return releases


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_press_releases(releases: list[PressRelease]) -> int:
    if not releases:
        return 0

    client = _load_supabase_client()
    rows = [
        {
            "id": release.id,
            "name": release.name,
            "pr_date": release.pr_date,
            "dipr_pr_no": release.dipr_pr_no,
            "pdf_url": release.pdf_url,
        }
        for release in releases
    ]
    client.table("tn_press_release").upsert(rows, on_conflict="id").execute()
    return len(rows)


def write_manifest(
    releases: list[PressRelease],
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    safe_start = _format_display_date(start_date).replace("-", "")
    safe_end = _format_display_date(end_date).replace("-", "")
    path = _MANIFESTS_DIR / f"tn_press_release_{safe_start}_to_{safe_end}.json"
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
    parser = argparse.ArgumentParser(description="Sync TN DIPR press releases to Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    parser.add_argument(
        "--start-date",
        help="Include releases from this date onward (DD-MM-YYYY). Defaults to TN_PRESS_RELEASE_START_DATE in .env.",
    )
    parser.add_argument(
        "--end-date",
        help="Include releases up to this date (DD-MM-YYYY). Defaults to today.",
    )
    args = parser.parse_args()

    source_url, default_start_date = _load_config()
    start_date = _parse_display_date(_normalize_date(args.start_date or default_start_date))
    end_date = _parse_display_date(_normalize_date(args.end_date)) if args.end_date else date.today()
    if start_date > end_date:
        raise SystemExit("start-date must be on or before end-date.")

    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)

    print(f"Source page: {source_url}")
    releases = fetch_press_releases(
        session,
        source_url=source_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(
        f"Found {len(releases)} press release(s) from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)}."
    )

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

    count = upsert_press_releases(releases)
    print(f"Upserted {count} rows into public.tn_press_release.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
