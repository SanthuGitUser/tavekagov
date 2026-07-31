"""
Fetch Tamil Nadu Council of Ministers from tn.gov.in and upsert into Supabase.

Usage:
  1. Ensure Public DB/.env has Supabase keys (see Public DB/.env.example).
  2. pip install -r requirements.txt
  3. python tn_ministers_sync.py
  4. Optional: python tn_ministers_sync.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

_ENTRY_RE = re.compile(
    r"minister_col_number['\"][^>]*>(\d+)</div>.*?"
    r"minister_col_img['\"][^>]*><img\s+src=['\"]([^'\"]+)['\"][^>]*>.*?"
    r"minister_col_description['\"][^>]*>"
    r"<h4[^>]*>(.*?)</h4>\s*<h4[^>]*>(.*?)</h4>\s*"
    r"<p[^>]*>(.*?)</p>\s*</div>",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")


def _load_source_url() -> str:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
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


def fetch_ministers(session: requests.Session | None = None) -> list[Minister]:
    source_url = _load_source_url()
    sess = session or requests.Session()
    response = sess.get(source_url, timeout=(20, 60))
    response.raise_for_status()
    html = response.text

    ministers: list[Minister] = []
    for match in _ENTRY_RE.finditer(html):
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


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_ministers(ministers: list[Minister]) -> int:
    client = _load_supabase_client()
    rows = [
        {
            "id": minister.id,
            "name": minister.name,
            "designation": minister.designation,
            "portfolio": minister.portfolio,
            "photo_url": minister.photo_url,
            "display_order": minister.display_order,
            "is_chief_minister": minister.is_chief_minister,
        }
        for minister in ministers
    ]
    client.table("tn_ministers").upsert(rows, on_conflict="id").execute()
    return len(rows)


def write_manifest(ministers: list[Minister]) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _MANIFESTS_DIR / "tn_ministers.json"
    payload = {
        "source_url": _load_source_url(),
        "count": len(ministers),
        "ministers": [asdict(minister) for minister in ministers],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync TN Council of Ministers to Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    args = parser.parse_args()

    print(f"Fetching ministers from {_load_source_url()} ...")
    ministers = fetch_ministers()
    print(f"Parsed {len(ministers)} ministers.")

    manifest_path = write_manifest(ministers)
    print(f"Wrote manifest: {manifest_path}")

    if args.dry_run:
        print("Dry run complete (no database changes).")
        return 0

    count = upsert_ministers(ministers)
    print(f"Upserted {count} rows into public.tn_ministers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
