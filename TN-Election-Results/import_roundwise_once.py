"""
One-time import: Tamil Nadu Assembly 2026 round-wise EVM counts from ECI → single JSON.

Source: https://results.eci.gov.in/ResultAcGenMay2026/

Usage:
  pip install -r requirements.txt
  python import_roundwise_once.py --ac 10
  python import_roundwise_once.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup
from curl_cffi import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

BASE = "https://results.eci.gov.in/ResultAcGenMay2026/"
KOLKATA = ZoneInfo("Asia/Kolkata")
TN_AC_MIN = 1
TN_AC_MAX = 234
# May 2026 TN results are no longer on live ECI (404); use Internet Archive snapshot from counting day.
DEFAULT_ARCHIVE_SNAPSHOT = "20260505000000"

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}

ROUND_STATUS_RE = re.compile(r"Status of EVM Round:\s*(\d+)\s*/\s*(\d+)", re.I)
ROUND_HEADING_RE = re.compile(r"Round\s+(\d+)\s*\(EVM\s+Votes\)", re.I)


def roundwise_live_url(ac: int) -> str:
    return f"{BASE}RoundwiseS22{ac}.htm?ac={ac}"


def roundwise_archive_url(ac: int, snapshot: str) -> str:
    return f"https://web.archive.org/web/{snapshot}/{roundwise_live_url(ac)}"


def parse_int(value: str) -> int:
    text = (value or "").strip().replace(",", "")
    if not text or text == "-":
        return 0
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else 0


def _is_header_row(cells: list[str]) -> bool:
    if not cells:
        return True
    first = cells[0].lower()
    return first in ("candidate", "total") or "party" in first


def parse_roundwise_html(html: str, ac: int, source_url: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    page_text = soup.get_text(" ", strip=True)
    status_match = ROUND_STATUS_RE.search(page_text)
    completed = int(status_match.group(1)) if status_match else None
    declared_total = int(status_match.group(2)) if status_match else None

    rounds: list[dict] = []
    for table in soup.find_all("table"):
        block = table.get_text(" ", strip=True)
        heading_match = ROUND_HEADING_RE.search(block)
        if not heading_match:
            continue
        round_no = int(heading_match.group(1))

        candidates: list[dict] = []
        for row in table.find_all("tr"):
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all(["td", "th"])]
            if len(cells) < 5 or _is_header_row(cells):
                continue
            name, party = cells[0], cells[1]
            if name.lower() == "total":
                continue
            candidates.append(
                {
                    "name": name,
                    "party": party,
                    "brought_forward": parse_int(cells[2]),
                    "current_round": parse_int(cells[3]),
                    "total": parse_int(cells[4]),
                }
            )

        if candidates:
            rounds.append({"round": round_no, "candidates": candidates})

    rounds.sort(key=lambda item: item["round"])
    parsed_max = max((item["round"] for item in rounds), default=0)

    return {
        "ac_number": ac,
        "source_url": source_url,
        "evm_round_status": (
            f"{completed}/{declared_total}" if completed is not None and declared_total is not None else None
        ),
        "total_rounds": declared_total or parsed_max,
        "rounds": rounds,
    }


def _get_html(
    session: requests.Session,
    url: str,
    timeout: tuple[float, float],
) -> str:
    response = session.get(url, timeout=timeout, impersonate="chrome120")
    if response.status_code == 404:
        raise requests.RequestsError(f"404 Not Found for url: {url}")
    response.raise_for_status()
    return response.text


def fetch_ac(
    session: requests.Session,
    ac: int,
    timeout: tuple[float, float],
    *,
    archive_snapshot: str | None,
    archive_only: bool,
) -> dict:
    live_url = roundwise_live_url(ac)
    if archive_only and archive_snapshot:
        source_url = roundwise_archive_url(ac, archive_snapshot)
        html = _get_html(session, source_url, timeout)
        return parse_roundwise_html(html, ac, source_url)

    source_url = live_url
    try:
        html = _get_html(session, live_url, timeout)
    except requests.RequestsError:
        if not archive_snapshot:
            raise
        source_url = roundwise_archive_url(ac, archive_snapshot)
        html = _get_html(session, source_url, timeout)

    return parse_roundwise_html(html, ac, source_url)


def live_results_available(session: requests.Session, timeout: tuple[float, float]) -> bool:
    try:
        _get_html(session, roundwise_live_url(TN_AC_MIN), timeout)
        return True
    except requests.RequestsError:
        return False


def write_payload(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from write_utils import write_json_if_changed

    write_json_if_changed(path, payload, volatile_top_level_keys={"fetchedAt", "errors"})


def main() -> int:
    parser = argparse.ArgumentParser(description="One-time ECI round-wise import for TN Assembly 2026.")
    parser.add_argument("--ac", type=int, help="Import only this assembly constituency number.")
    parser.add_argument("--delay", type=float, default=0.35, help="Seconds between HTTP requests.")
    parser.add_argument(
        "--archive-snapshot",
        default=DEFAULT_ARCHIVE_SNAPSHOT,
        help=(
            "Internet Archive timestamp when live ECI returns 404 "
            f"(default: {DEFAULT_ARCHIVE_SNAPSHOT}). Use '' to disable archive fallback."
        ),
    )
    parser.add_argument(
        "--live-only",
        action="store_true",
        help="Do not fall back to web.archive.org when live ECI is unavailable.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_MANIFESTS_DIR / "tn_assembly_2026_roundwise.json",
        help="Output JSON path.",
    )
    args = parser.parse_args()

    if args.ac is not None and not (TN_AC_MIN <= args.ac <= TN_AC_MAX):
        print(f"--ac must be between {TN_AC_MIN} and {TN_AC_MAX}.", file=sys.stderr)
        return 1

    ac_numbers = [args.ac] if args.ac is not None else list(range(TN_AC_MIN, TN_AC_MAX + 1))

    archive_snapshot = args.archive_snapshot.strip() or None
    if args.live_only:
        archive_snapshot = None

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)
    archive_only = bool(archive_snapshot) and not live_results_available(
        session, DEFAULT_CONNECT_READ_TIMEOUT
    )
    if archive_only:
        print(
            f"Live ECI round-wise pages unavailable; using web.archive.org snapshot {archive_snapshot}."
        )

    results: list[dict] = []
    errors: list[dict] = []

    for index, ac in enumerate(ac_numbers, start=1):
        try:
            row = fetch_ac(
                session,
                ac,
                DEFAULT_CONNECT_READ_TIMEOUT,
                archive_snapshot=archive_snapshot,
                archive_only=archive_only,
            )
            if not row["rounds"]:
                errors.append({"ac_number": ac, "error": "no rounds parsed"})
                print(f"[{index}/{len(ac_numbers)}] AC {ac}: no rounds parsed", file=sys.stderr)
            else:
                results.append(row)
                print(
                    f"[{index}/{len(ac_numbers)}] AC {ac}: "
                    f"{len(row['rounds'])} rounds ({row.get('evm_round_status') or '?'})"
                )
        except requests.RequestException as exc:
            errors.append({"ac_number": ac, "error": str(exc)})
            print(f"[{index}/{len(ac_numbers)}] AC {ac}: request failed — {exc}", file=sys.stderr)
        except Exception as exc:
            errors.append({"ac_number": ac, "error": str(exc)})
            print(f"[{index}/{len(ac_numbers)}] AC {ac}: failed — {exc}", file=sys.stderr)

        if index < len(ac_numbers):
            time.sleep(args.delay)

    payload = {
        "election_id": "tn-assembly-2026",
        "source_base": BASE,
        "archive_snapshot": archive_snapshot,
        "fetchedAt": datetime.now(KOLKATA).isoformat(),
        "count": len(results),
        "results": sorted(results, key=lambda item: item["ac_number"]),
        "errors": errors,
    }

    write_payload(args.output, payload)
    print(f"Wrote {args.output} ({len(results)} OK, {len(errors)} errors)")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
