"""
Fetch IAS transfer and posting G.O.s from tnsectdemo.tn.gov.in and save daily JSON files.

Each G.O. date writes to Response JSON/YYYY-MM-DD.json. Re-runs merge by pdf_url.

Usage:
  1. pip install -r requirements.txt
  2. python tn_transfers_postings_sync.py
  3. Optional: python tn_transfers_postings_sync.py --start-date 10-05-2026 --end-date 31-07-2026
     (defaults: start from TN_IAS_TRANSFERS_POSTINGS_START_DATE in .env, end = today Asia/Kolkata)
"""

from __future__ import annotations

import argparse
import re
import sys
import warnings
from dataclasses import asdict, dataclass
from datetime import date, datetime
from html import unescape
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests
import urllib3

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"
_KOLKATA = ZoneInfo("Asia/Kolkata")

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


def _load_config() -> tuple[str, str]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import (
        get_tn_ias_transfers_postings_source_url,
        get_tn_ias_transfers_postings_start_date,
    )

    return (
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
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    response = session.get(source_url, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    response.raise_for_status()

    all_postings = parse_transfer_postings(response.text, base_url=source_url)
    return [
        posting
        for posting in all_postings
        if start_date <= _parse_display_date(posting.go_date) <= end_date
    ]


def _posting_to_json_record(posting: TransferPosting) -> dict[str, object]:
    record = asdict(posting)
    record["go_date"] = _parse_display_date(posting.go_date).isoformat()
    return record


def save_daily_responses(
    output_dir: Path,
    *,
    postings: list[TransferPosting],
    source_url: str,
) -> list[Path]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from daily_json import write_items_by_day

    fetched_at = datetime.now(_KOLKATA)
    records = [_posting_to_json_record(posting) for posting in postings]

    return write_items_by_day(
        output_dir,
        items_key="postings",
        items=records,
        date_fn=lambda item: date.fromisoformat(str(item["go_date"])),
        source_url=source_url,
        fetched_at=fetched_at,
        merge_key_fn=lambda item: str(item.get("pdf_url") or ""),
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch IAS transfer and posting G.O.s and save daily JSON responses.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for daily JSON responses (YYYY-MM-DD.json).",
    )
    parser.add_argument(
        "--start-date",
        help="Include G.O.s from this date onward (DD-MM-YYYY). Defaults to TN_IAS_TRANSFERS_POSTINGS_START_DATE.",
    )
    parser.add_argument(
        "--end-date",
        help="Include G.O.s up to this date (DD-MM-YYYY). Defaults to today (Asia/Kolkata).",
    )
    args = parser.parse_args()

    source_url, default_start_date = _load_config()
    start_date = _parse_display_date(_normalize_date(args.start_date or default_start_date))
    end_date = (
        _parse_display_date(_normalize_date(args.end_date))
        if args.end_date
        else datetime.now(_KOLKATA).date()
    )
    if start_date > end_date:
        raise SystemExit("start-date must be on or before end-date.")

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    session = build_retry_session(headers=_DEFAULT_HEADERS)
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

    saved_paths = save_daily_responses(
        Path(args.output_dir),
        postings=postings,
        source_url=source_url,
    )
    print(f"Saved {len(saved_paths)} daily JSON file(s).")
    if saved_paths:
        print(f"Latest file: {saved_paths[-1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
