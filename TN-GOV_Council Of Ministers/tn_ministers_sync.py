"""
Fetch Tamil Nadu Council of Ministers from tn.gov.in and save to manifests/tn_ministers.json.

Usage:
  1. pip install -r requirements.txt
  2. python tn_ministers_sync.py
  3. Optional: python tn_ministers_sync.py --output-dir path/to/manifests
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_KOLKATA = ZoneInfo("Asia/Kolkata")

_ENTRY_RE = re.compile(
    r"minister_col_number['\"][^>]*>(\d+)</div>.*?"
    r"minister_col_img['\"][^>]*><img\s+src=['\"]([^'\"]+)['\"][^>]*>.*?"
    r"minister_col_description['\"][^>]*>"
    r"<h4[^>]*>(.*?)</h4>\s*<h4[^>]*>(.*?)</h4>\s*"
    r"<p[^>]*>(.*?)</p>\s*</div>",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def _load_source_url() -> str:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_ministers_source_url

    return get_tn_ministers_source_url()


@dataclass(frozen=True)
class Minister:
    id: int
    name: str
    designation: str
    portfolio: str
    photo_url: str
    display_order: int
    is_chief_minister: bool


def _clean_text(value: str) -> str:
    text = _TAG_RE.sub(" ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def fetch_ministers(
    session: requests.Session,
    *,
    timeout: tuple[float, float],
) -> list[Minister]:
    source_url = _load_source_url()
    response = session.get(source_url, timeout=timeout)
    response.raise_for_status()
    page_html = response.text

    ministers: list[Minister] = []
    for match in _ENTRY_RE.finditer(page_html):
        order_raw, photo_url, raw_name, raw_designation, raw_portfolio = match.groups()
        designation = _clean_text(raw_designation)
        ministers.append(
            Minister(
                id=int(order_raw),
                name=_clean_text(raw_name),
                designation=designation,
                portfolio=_clean_text(raw_portfolio),
                photo_url=photo_url.strip(),
                display_order=int(order_raw),
                is_chief_minister="chief minister" in designation.lower(),
            )
        )

    if not ministers:
        raise RuntimeError("No ministers found — the source page layout may have changed.")

    return ministers


def write_manifest(ministers: list[Minister], *, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "tn_ministers.json"
    payload = {
        "source_url": _load_source_url(),
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(ministers),
        "ministers": [asdict(minister) for minister in ministers],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN Council of Ministers and save tn_ministers.json.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_MANIFESTS_DIR),
        help="Folder for tn_ministers.json (default: manifests/).",
    )
    args = parser.parse_args()

    source_url = _load_source_url()
    print(f"Fetching ministers from {source_url} ...")
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    try:
        ministers = fetch_ministers(session, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    except requests.RequestException as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    manifest_path = write_manifest(ministers, output_dir=Path(args.output_dir))
    print(f"Parsed {len(ministers)} ministers.")
    print(f"Wrote manifest: {manifest_path}")
    from sync_state import JOB_MINISTERS, record_sync

    record_sync(JOB_MINISTERS)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
