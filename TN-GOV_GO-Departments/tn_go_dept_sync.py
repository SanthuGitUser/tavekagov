"""
Fetch Tamil Nadu department Government Orders (G.O.s) from tn.gov.in and upsert into Supabase.

Usage:
  1. Ensure Public DB/.env has Supabase keys and TN_GO_* source settings.
  2. pip install -r requirements.txt
  3. python tn_go_dept_sync.py
  4. Optional: python tn_go_dept_sync.py --dry-run
  5. Optional: python tn_go_dept_sync.py --start-date 10-05-2026 --end-date 21-07-2026
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urljoin

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"

_DEPT_LINK_RE = re.compile(
    r"href=go\.php\?dep_id=([^&>\s]+)&year=([^&>\s]+)\s*>([^<]+)",
    re.IGNORECASE,
)
_DATE_RE = re.compile(r"<b>(\d{2}[-/.]\d{2}[-/.]\d{4})</b>")
_GO_LINK_RE = re.compile(
    r'<h4 class="event-name">\s*<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
_GO_DETAIL_RE = re.compile(
    r'<p class="event-detail">\s*(.*?)\s*(?:<a|<img|</p>)',
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
class GovernmentOrder:
    go_date: str
    go_number: str
    go_name: str
    department_name: str
    dep_id_encoded: str
    pdf_url: str


def _load_config() -> tuple[str, str, str]:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import get_tn_go_dept_source_url, get_tn_go_start_date, get_tn_gov_base_url

    return get_tn_go_dept_source_url(), get_tn_gov_base_url(), get_tn_go_start_date()


def _clean_text(value: str) -> str:
    text = _TAG_RE.sub(" ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-")


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _encode_year(year: int) -> str:
    return base64.b64encode(str(year).encode("utf-8")).decode("utf-8")


def _department_go_url(base_url: str, dep_id_encoded: str, year_b64: str) -> str:
    return urljoin(base_url, f"go.php?dep_id={dep_id_encoded}&year={year_b64}")


def fetch_departments(session: requests.Session, source_url: str) -> list[tuple[str, str]]:
    response = session.get(source_url, timeout=(20, 60))
    response.raise_for_status()
    departments: list[tuple[str, str]] = []
    seen: set[str] = set()
    for dep_id_encoded, _year, raw_name in _DEPT_LINK_RE.findall(response.text):
        dep_id_encoded = dep_id_encoded.strip()
        if dep_id_encoded in seen:
            continue
        seen.add(dep_id_encoded)
        departments.append((dep_id_encoded, _clean_text(raw_name)))
    if not departments:
        raise RuntimeError("No departments found — the source page layout may have changed.")
    return departments


def parse_government_orders(html: str, department_name: str, dep_id_encoded: str) -> list[GovernmentOrder]:
    orders: list[GovernmentOrder] = []
    for chunk in re.split(r'<div class="row go-list">', html, flags=re.IGNORECASE)[1:]:
        date_match = _DATE_RE.search(chunk)
        link_match = _GO_LINK_RE.search(chunk)
        if not date_match or not link_match:
            continue

        detail_match = _GO_DETAIL_RE.search(chunk)
        orders.append(
            GovernmentOrder(
                go_date=_normalize_date(date_match.group(1)),
                go_number=_clean_text(link_match.group(2)),
                go_name=_clean_text(detail_match.group(1) if detail_match else ""),
                department_name=department_name,
                dep_id_encoded=dep_id_encoded,
                pdf_url=link_match.group(1).strip(),
            )
        )
    return orders


def _order_in_range(order: GovernmentOrder, start_date: date, end_date: date) -> bool:
    order_date = _parse_display_date(order.go_date)
    return start_date <= order_date <= end_date


def fetch_matching_orders(
    session: requests.Session,
    *,
    source_url: str,
    base_url: str,
    start_date: date,
    end_date: date,
) -> list[GovernmentOrder]:
    departments = fetch_departments(session, source_url)
    years = range(start_date.year, end_date.year + 1)
    matches: list[GovernmentOrder] = []
    seen: set[tuple[str, str, str, str]] = set()

    print(
        f"Checking {len(departments)} departments for G.O.s from "
        f"{_format_display_date(start_date)} to {_format_display_date(end_date)} ..."
    )
    for index, (dep_id_encoded, department_name) in enumerate(departments, start=1):
        dept_matches = 0
        for year in years:
            go_url = _department_go_url(base_url, dep_id_encoded, _encode_year(year))
            response = session.get(go_url, timeout=(20, 60), headers={"Referer": source_url})
            if not response.text.strip():
                continue

            for order in parse_government_orders(response.text, department_name, dep_id_encoded):
                if not _order_in_range(order, start_date, end_date):
                    continue
                key = (order.go_number, order.dep_id_encoded, order.go_date, order.pdf_url)
                if key in seen:
                    continue
                seen.add(key)
                matches.append(order)
                dept_matches += 1

        status = f"{dept_matches} match(es)" if dept_matches else "0 matches"
        print(f"  [{index}/{len(departments)}] {department_name}: {status}")
        time.sleep(0.2)

    return matches


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_government_orders(orders: list[GovernmentOrder]) -> int:
    if not orders:
        return 0

    client = _load_supabase_client()
    rows = [
        {
            "go_date": _parse_display_date(order.go_date).isoformat(),
            "go_number": order.go_number,
            "go_name": order.go_name,
            "department_name": order.department_name,
            "dep_id_encoded": order.dep_id_encoded,
            "pdf_url": order.pdf_url,
        }
        for order in orders
    ]
    client.table("tn_go_dept").upsert(
        rows,
        on_conflict="go_number,dep_id_encoded,go_date,pdf_url",
    ).execute()
    return len(rows)


def write_manifest(
    orders: list[GovernmentOrder],
    *,
    source_url: str,
    start_date: date,
    end_date: date,
) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    safe_start = _format_display_date(start_date).replace("-", "")
    safe_end = _format_display_date(end_date).replace("-", "")
    path = _MANIFESTS_DIR / f"tn_go_dept_{safe_start}_to_{safe_end}.json"
    payload = {
        "source_url": source_url,
        "start_date": _format_display_date(start_date),
        "end_date": _format_display_date(end_date),
        "count": len(orders),
        "orders": [asdict(order) for order in orders],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync TN department G.O.s to Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    parser.add_argument(
        "--start-date",
        help="Include G.O.s from this date onward (DD-MM-YYYY). Defaults to TN_GO_START_DATE in .env.",
    )
    parser.add_argument(
        "--end-date",
        help="Include G.O.s up to this date (DD-MM-YYYY). Defaults to today.",
    )
    args = parser.parse_args()

    source_url, base_url, default_start_date = _load_config()
    start_date = _parse_display_date(_normalize_date(args.start_date or default_start_date))
    end_date = _parse_display_date(_normalize_date(args.end_date)) if args.end_date else date.today()
    if start_date > end_date:
        raise SystemExit("start-date must be on or before end-date.")

    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)

    print(f"Source list: {source_url}")
    orders = fetch_matching_orders(
        session,
        source_url=source_url,
        base_url=base_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(
        f"Found {len(orders)} G.O.(s) from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)}."
    )

    manifest_path = write_manifest(
        orders,
        source_url=source_url,
        start_date=start_date,
        end_date=end_date,
    )
    print(f"Wrote manifest: {manifest_path}")

    if args.dry_run:
        print("Dry run complete (no database changes).")
        return 0

    count = upsert_government_orders(orders)
    print(f"Upserted {count} rows into public.tn_go_dept.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
