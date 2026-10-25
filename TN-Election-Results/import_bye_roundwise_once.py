"""
Import Tamil Nadu Assembly bye-election Oct 2026 round-wise EVM counts from ECI.

Source: https://results.eci.gov.in/ResultAcByeOct2026/

TN constituencies: Madurantakam (35), Dharapuram (101).

Usage:
  pip install -r requirements.txt
  python import_bye_roundwise_once.py
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from curl_cffi import requests

from import_roundwise_once import (
    _DEFAULT_HEADERS,
    parse_roundwise_html,
    write_payload,
)

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

BASE = "https://results.eci.gov.in/ResultAcByeOct2026/"
KOLKATA = ZoneInfo("Asia/Kolkata")
TN_BYE_AC_NUMBERS = (35, 101)


def roundwise_live_url(ac: int) -> str:
    return f"{BASE}RoundwiseS22{ac}.htm?ac={ac}"


def fetch_bye_ac(
    session: requests.Session,
    ac: int,
    timeout: tuple[float, float],
) -> dict:
    live_url = roundwise_live_url(ac)
    response = session.get(live_url, timeout=timeout, impersonate="chrome120")
    response.raise_for_status()
    return parse_roundwise_html(response.text, ac, live_url)


def main() -> int:
    parser = argparse.ArgumentParser(description="ECI round-wise import for TN Assembly bye-election Oct 2026.")
    parser.add_argument("--ac", type=int, help="Import only this AC (35 or 101).")
    parser.add_argument("--delay", type=float, default=0.35, help="Seconds between HTTP requests.")
    parser.add_argument(
        "--output",
        type=Path,
        default=_MANIFESTS_DIR / "tn_assembly_2026_bye_roundwise.json",
        help="Output JSON path.",
    )
    args = parser.parse_args()

    if args.ac is not None and args.ac not in TN_BYE_AC_NUMBERS:
        print(f"--ac must be one of {TN_BYE_AC_NUMBERS}.", file=sys.stderr)
        return 1

    ac_numbers = [args.ac] if args.ac is not None else list(TN_BYE_AC_NUMBERS)

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)

    results: list[dict] = []
    errors: list[dict] = []

    for index, ac in enumerate(ac_numbers, start=1):
        try:
            row = fetch_bye_ac(session, ac, DEFAULT_CONNECT_READ_TIMEOUT)
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

    results.sort(key=lambda item: item["ac_number"])
    payload = {
        "election_id": "tn-assembly-2026-bye",
        "election_label": "Assembly bye-election October 2026",
        "source_base": BASE,
        "archive_snapshot": None,
        "fetchedAt": datetime.now(KOLKATA).isoformat(),
        "count": len(results),
        "results": results,
        "errors": errors,
    }
    write_payload(args.output, payload)
    print(f"Wrote {args.output} ({len(results)} OK, {len(errors)} errors)")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
