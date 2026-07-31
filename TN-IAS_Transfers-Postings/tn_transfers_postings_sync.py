"""
Fetch IAS transfer and posting G.O.s from tnsectdemo.tn.gov.in and upsert into Supabase.

Usage:
  1. Ensure Public DB/.env has Supabase keys and TN_IAS_TRANSFERS_POSTINGS_* settings.
  2. pip install -r requirements.txt
  3. python tn_transfers_postings_sync.py
  4. Optional: python tn_transfers_postings_sync.py --dry-run
  5. Optional: python tn_transfers_postings_sync.py --start-date 10-05-2026 --end-date 30-07-2026
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import warnings
from dataclasses import asdict, dataclass
from datetime import date, datetime
from html import unescape
from pathlib import Path
from urllib.parse import urljoin

import requests
import urllib3

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

_ROW_RE = re.compile(
    r"<tr>\s*<td[^>]*>(\d+)</td>\s*"
    r"<td[^>]*>([^<]+)</td>\s*"
    r"<td>.*?exid=[\"']([^\"']+)[\"'].*?href=[\"']([^\"']+)[\"'][^>]*>([^<]+)",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


@dataclass(frozen=True)
class TransferPosting:
    serial_number: int
    go_date: str
    go_number: str
    subject: str
    pdf_url: str


def _load_config() -> tuple[str, str, str]:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import (
        get_tn_ias_transfers_postings_source_url,
        get_tn_ias_transfers_postings_start_date,
    )

    return (
        get_tn_ias_transfers_postings_source_url(),
        get_tn_ias_transfers_postings_source_url(),
        get_tn_ias_transfers_postings_start_date(),
    )


def _clean_text(value: str) -> str:
    text = unescape(_TAG_RE.sub(" ", value or ""))
    return re.sub(r"\s+", " ", text).strip()


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-").strip()


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    for fmt in ("%d-%m-%Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(normalized, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date: {value!r}")


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def parse_transfer_postings(html: str, *, base_url: str) -> list[TransferPosting]:
    postings: list[TransferPosting] = []
    seen_urls: set[str] = set()

    for serial_raw, go_date_raw, go_number_raw, pdf_href, subject_raw in _ROW_RE.findall(html):
        pdf_url = urljoin(base_url, pdf_href.strip())
        if pdf_url in seen_urls:
            continue
        seen_urls.add(pdf_url)

        postings.append(
            TransferPosting(
                serial_number=int(serial_raw),
                go_date=_normalize_date(go_date_raw),
                go_number=_clean_text(go_number_raw),
                subject=_clean_text(subject_raw),
                pdf_url=pdf_url,
            )
        )

    return postings


def fetch_transfer_postings(
    session: requests.Session,
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> list[TransferPosting]:
    response = session.get(source_url, timeout=(20, 120))
    response.raise_for_status()

    all_postings = parse_transfer_postings(response.text, base_url=source_url)
    return [
        posting
        for posting in all_postings
        if start_date <= _parse_display_date(posting.go_date) <= end_date
    ]


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_transfer_postings(postings: list[TransferPosting]) -> int:
    if not postings:
        return 0

    client = _load_supabase_client()
    rows = [
        {
            "serial_number": posting.serial_number,
            "go_date": _parse_display_date(posting.go_date).isoformat(),
            "go_number": posting.go_number,
            "subject": posting.subject,
            "pdf_url": posting.pdf_url,
        }
        for posting in postings
    ]
    client.table("tn_transfers_postings").upsert(rows, on_conflict="pdf_url").execute()
    return len(rows)


def write_manifest(
    postings: list[TransferPosting],
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    safe_start = _format_display_date(start_date).replace("-", "")
    safe_end = _format_display_date(end_date).replace("-", "")
    path = _MANIFESTS_DIR / f"tn_transfers_postings_{safe_start}_to_{safe_end}.json"
    payload = {
        "source_url": source_url,
        "start_date": _format_display_date(start_date),
        "end_date": _format_display_date(end_date),
        "count": len(postings),
        "postings": [asdict(posting) for posting in postings],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync IAS transfer and posting G.O.s to Supabase.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    parser.add_argument(
        "--start-date",
        help="Include G.O.s from this date onward (DD-MM-YYYY). Defaults to TN_IAS_TRANSFERS_POSTINGS_START_DATE.",
    )
    parser.add_argument(
        "--end-date",
        help="Include G.O.s up to this date (DD-MM-YYYY). Defaults to today.",
    )
    args = parser.parse_args()

    source_url, _base_url, default_start_date = _load_config()
    start_date = _parse_display_date(_normalize_date(args.start_date or default_start_date))
    end_date = _parse_display_date(_normalize_date(args.end_date)) if args.end_date else date.today()
    if start_date > end_date:
        raise SystemExit("start-date must be on or before end-date.")

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)
    session.verify = False

    print(f"Source page: {source_url}")
    postings = fetch_transfer_postings(
        session,
        source_url=source_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(
        f"Found {len(postings)} transfer/posting G.O.(s) from "
        f"{_format_display_date(start_date)} to {_format_display_date(end_date)}."
    )

    manifest_path = write_manifest(
        postings,
        source_url=source_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Wrote manifest: {manifest_path}")

    if args.dry_run:
        print("Dry run complete (no database changes).")
        return 0

    count = upsert_transfer_postings(postings)
    print(f"Upserted {count} row(s) into public.tn_transfers_postings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
