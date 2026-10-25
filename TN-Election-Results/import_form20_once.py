"""
Import Tamil Nadu Assembly Form 20 (polling-station-wise) PDFs from CEO TN.

General election index:
  https://www.elections.tn.gov.in/Form20_TNLA2026.aspx

Bye-election (AC 35 & 101):
  https://www.elections.tn.gov.in/Form20_BE2026_35_101.aspx

Usage:
  pip install -r requirements.txt
  python import_form20_once.py --ac 20
  python import_form20_once.py
  python import_form20_once.py --bye-only
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup
from curl_cffi import requests

from form20_parser import parse_form20_pdf, pdf_has_extractable_grid

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

CEO_BASE = "https://www.elections.tn.gov.in/"
KOLKATA = ZoneInfo("Asia/Kolkata")

GENERAL_INDEX = "Form20_TNLA2026.aspx"
BYE_INDEX = "Form20_BE2026_35_101.aspx"

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from write_utils import write_json_if_changed

    write_json_if_changed(path, payload, volatile_top_level_keys={"fetchedAt"})


def ac_from_href(href: str) -> int | None:
    match = re.search(r"AC0*(\d+)\.pdf", href, re.I)
    return int(match.group(1)) if match else None


def fetch_index_links(session: requests.Session, index_path: str, timeout: tuple[float, float]) -> dict[int, str]:
    url = urljoin(CEO_BASE, index_path)
    response = session.get(url, timeout=timeout, impersonate="chrome120")
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    by_ac: dict[int, str] = {}
    for anchor in soup.find_all("a", href=True):
        href = anchor["href"]
        ac = ac_from_href(href)
        if ac is None:
            continue
        by_ac[ac] = urljoin(CEO_BASE, href)
    return by_ac


def load_manifest(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def main() -> int:
    parser = argparse.ArgumentParser(description="Import TN Form 20 booth-wise PDFs.")
    parser.add_argument("--ac", type=int, help="Import only this assembly constituency.")
    parser.add_argument("--delay", type=float, default=0.25, help="Seconds between PDF downloads.")
    parser.add_argument("--bye-only", action="store_true", help="Import only bye-election Form 20 PDFs.")
    parser.add_argument("--include-bye", action="store_true", help="Also import bye-election Form 20 after general.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=_MANIFESTS_DIR / "tn_assembly_2026_form20",
        help="Output directory for manifest + per-AC JSON.",
    )
    parser.add_argument(
        "--resume",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Skip ACs that already have ac/{ac}.json (default: on).",
    )
    args = parser.parse_args()

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)
    timeout = DEFAULT_CONNECT_READ_TIMEOUT

    jobs: list[tuple[str, str, dict[int, str]]] = []
    if not args.bye_only:
        general_links = fetch_index_links(session, GENERAL_INDEX, timeout)
        jobs.append(("tn-assembly-2026-form20", "general", general_links))
    if args.bye_only or args.include_bye:
        bye_links = fetch_index_links(session, BYE_INDEX, timeout)
        jobs.append(("tn-assembly-2026-bye-form20", "bye", bye_links))

    if not jobs:
        print("No import jobs configured.", file=sys.stderr)
        return 1

    exit_code = 0

    for election_id, label, links in jobs:
        output_dir = args.output_dir if label == "general" else _MANIFESTS_DIR / "tn_assembly_2026_bye_form20"
        ac_dir = output_dir / "ac"
        manifest_path = output_dir / "manifest.json"

        ac_numbers = sorted(links.keys())
        if args.ac is not None:
            if args.ac not in links:
                print(f"AC {args.ac} not in {label} index.", file=sys.stderr)
                exit_code = 1
                continue
            ac_numbers = [args.ac]

        manifest = load_manifest(manifest_path)
        constituencies: list[dict] = list(manifest.get("constituencies") or [])
        by_ac_meta = {row["ac_number"]: row for row in constituencies if isinstance(row.get("ac_number"), int)}
        errors: list[dict] = []

        print(f"=== {label}: {len(ac_numbers)} constituencies ===", flush=True)

        for index, ac in enumerate(ac_numbers, start=1):
            ac_path = ac_dir / f"{ac:03d}.json"
            if args.resume and ac_path.is_file() and args.ac is None:
                print(f"[{index}/{len(ac_numbers)}] AC {ac}: skipped (exists)", flush=True)
                continue

            pdf_url = links[ac]
            try:
                response = session.get(pdf_url, timeout=timeout, impersonate="chrome120")
                response.raise_for_status()
                parsed = parse_form20_pdf(response.content)
                if not parsed["booths"]:
                    if not pdf_has_extractable_grid(response.content):
                        message = "image-only PDF (no extractable text; OCR not configured)"
                    else:
                        message = "no booths parsed"
                    errors.append({"ac_number": ac, "error": message})
                    print(f"[{index}/{len(ac_numbers)}] AC {ac}: {message}", file=sys.stderr)
                    exit_code = 1
                    continue

                payload = {
                    "ac_number": ac,
                    "election_id": election_id,
                    "source_url": pdf_url,
                    "layout": parsed["layout"],
                    "candidates": parsed["candidates"],
                    "booth_count": parsed["booth_count"],
                    "booths": parsed["booths"],
                }
                write_json(ac_path, payload)
                by_ac_meta[ac] = {
                    "ac_number": ac,
                    "source_url": pdf_url,
                    "booth_count": parsed["booth_count"],
                    "candidate_count": len(parsed["candidates"]),
                    "layout": parsed["layout"],
                }
                print(
                    f"[{index}/{len(ac_numbers)}] AC {ac}: "
                    f"{parsed['booth_count']} booths, {len(parsed['candidates'])} candidates ({parsed['layout']})",
                    flush=True,
                )
            except Exception as exc:
                if isinstance(exc, (KeyboardInterrupt, SystemExit)):
                    raise
                errors.append({"ac_number": ac, "error": str(exc)})
                print(f"[{index}/{len(ac_numbers)}] AC {ac}: failed — {exc}", file=sys.stderr)
                exit_code = 1

            if index < len(ac_numbers):
                time.sleep(args.delay)

        manifest_payload = {
            "election_id": election_id,
            "source_index": urljoin(CEO_BASE, GENERAL_INDEX if label == "general" else BYE_INDEX),
            "fetchedAt": datetime.now(KOLKATA).isoformat(),
            "count": len(by_ac_meta),
            "constituencies": sorted(by_ac_meta.values(), key=lambda row: row["ac_number"]),
            "errors": errors,
        }
        write_json(manifest_path, manifest_payload)
        print(f"Wrote {manifest_path} ({len(by_ac_meta)} OK, {len(errors)} errors)")

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
