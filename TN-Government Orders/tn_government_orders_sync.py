"""
Fetch Tamil Nadu Government Orders by department from tn.gov.in and save one JSON
file per department under Response JSON/.

Source list: https://www.tn.gov.in/godept_list.php

Only G.O.s on or after the configured start date (default 10-05-2026) are kept.

Usage:
  1. pip install -r requirements.txt
  2. python tn_government_orders_sync.py
  3. Refresh existing department files (replace orders array):
     python tn_government_orders_sync.py --from-existing --replace-orders
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
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"
_KOLKATA = ZoneInfo("Asia/Kolkata")

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
_SLUG_RE = re.compile(r"[^a-z0-9]+")
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


@dataclass(frozen=True)
class Department:
    dep_id_encoded: str
    name: str
    list_year_b64: str


@dataclass(frozen=True)
class GovernmentOrder:
    go_date: str
    go_number: str
    go_name: str
    pdf_url: str


def _load_config() -> tuple[str, str, str]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_go_dept_source_url, get_tn_go_start_date, get_tn_gov_base_url

    return get_tn_go_dept_source_url(), get_tn_gov_base_url(), get_tn_go_start_date()


def _clean_text(value: str) -> str:
    text = _TAG_RE.sub(" ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def _normalize_date(value: str) -> str:
    return value.replace(".", "-").replace("/", "-")


def _parse_display_date(value: str) -> date:
    normalized = _normalize_date(value)
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", normalized):
        return date.fromisoformat(normalized)
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def _format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _encode_year(year: int) -> str:
    return base64.b64encode(str(year).encode("utf-8")).decode("utf-8")


def _department_go_url(base_url: str, dep_id_encoded: str, year_b64: str) -> str:
    return urljoin(base_url, f"go.php?dep_id={dep_id_encoded}&year={year_b64}")


def _department_slug(name: str, dep_id_encoded: str) -> str:
    slug = _SLUG_RE.sub("-", _clean_text(name).lower()).strip("-")
    return slug or dep_id_encoded.replace("=", "")


def fetch_departments(session: requests.Session, source_url: str) -> list[Department]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    response = session.get(source_url, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    response.raise_for_status()

    departments: list[Department] = []
    seen: set[str] = set()
    for dep_id_encoded, year_b64, raw_name in _DEPT_LINK_RE.findall(response.text):
        dep_id_encoded = dep_id_encoded.strip()
        if dep_id_encoded in seen:
            continue
        seen.add(dep_id_encoded)
        departments.append(
            Department(
                dep_id_encoded=dep_id_encoded,
                name=_clean_text(raw_name),
                list_year_b64=year_b64.strip(),
            )
        )

    if not departments:
        raise RuntimeError("No departments found — the source page layout may have changed.")
    return departments


def load_departments_from_existing(output_dir: Path) -> list[tuple[Department, Path]]:
    departments: list[tuple[Department, Path]] = []
    for path in sorted(output_dir.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        dep_id_encoded = str(payload.get("dep_id_encoded") or "").strip()
        department_name = str(payload.get("department_name") or "").strip()
        department_url = str(payload.get("department_url") or "").strip()
        if not dep_id_encoded or not department_name:
            print(f"  Skipping {path.name}: missing dep_id_encoded or department_name.")
            continue

        year_b64 = ""
        year_match = re.search(r"year=([^&]+)", department_url)
        if year_match:
            year_b64 = year_match.group(1)

        departments.append(
            (
                Department(
                    dep_id_encoded=dep_id_encoded,
                    name=department_name,
                    list_year_b64=year_b64,
                ),
                path,
            )
        )

    if not departments:
        raise RuntimeError(f"No department JSON files found in {output_dir}.")
    return departments


def parse_government_orders(html: str) -> list[GovernmentOrder]:
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
                pdf_url=link_match.group(1).strip(),
            )
        )
    return orders


def _order_in_range(order: GovernmentOrder, start_date: date, end_date: date) -> bool:
    order_date = _parse_display_date(order.go_date)
    return start_date <= order_date <= end_date


def _order_merge_key(item: dict[str, object]) -> str:
    return "|".join(
        [
            str(item.get("go_number") or ""),
            str(item.get("go_date") or ""),
            str(item.get("pdf_url") or ""),
        ]
    )


def _order_to_json_record(
    order: GovernmentOrder,
    *,
    department_name: str,
    dep_id_encoded: str,
) -> dict[str, object]:
    parts = order.go_date.split("-")
    iso_date = f"{parts[2]}-{parts[1]}-{parts[0]}" if len(parts) == 3 else order.go_date
    record = asdict(order)
    record["go_date"] = iso_date
    record["department_name"] = department_name
    record["dep_id_encoded"] = dep_id_encoded
    return record


def fetch_department_orders(
    session: requests.Session,
    *,
    base_url: str,
    department: Department,
    source_url: str,
    years: range,
    start_date: date,
    end_date: date,
) -> list[GovernmentOrder]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    matches: list[GovernmentOrder] = []
    seen: set[tuple[str, str, str]] = set()

    for year in years:
        go_url = _department_go_url(base_url, department.dep_id_encoded, _encode_year(year))
        response = session.get(
            go_url,
            timeout=DEFAULT_CONNECT_READ_TIMEOUT,
            headers={"Referer": source_url},
        )
        if not response.text.strip():
            continue

        for order in parse_government_orders(response.text):
            if not _order_in_range(order, start_date, end_date):
                continue
            key = (order.go_number, order.go_date, order.pdf_url)
            if key in seen:
                continue
            seen.add(key)
            matches.append(order)

    return matches


def save_department_json(
    output_dir: Path,
    *,
    department: Department,
    orders: list[GovernmentOrder],
    source_url: str,
    base_url: str,
    years: range,
    start_date: date,
    replace_orders: bool,
    output_path: Path | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_path or (
        output_dir / f"{_department_slug(department.name, department.dep_id_encoded)}.json"
    )
    fetched_at = datetime.now(_KOLKATA).isoformat()
    records = [
        _order_to_json_record(
            order,
            department_name=department.name,
            dep_id_encoded=department.dep_id_encoded,
        )
        for order in orders
    ]
    records.sort(key=lambda item: str(item.get("go_date") or ""), reverse=True)

    existing_record: dict[str, object] | None = None
    if out_path.exists():
        existing_record = json.loads(out_path.read_text(encoding="utf-8"))

    existing_items: list[dict[str, object]] = []
    fetch_count = 1
    first_fetched_at = fetched_at
    if existing_record:
        raw_existing = existing_record.get("orders")
        if isinstance(raw_existing, list):
            existing_items = raw_existing
        fetch_count = int(existing_record.get("fetchCount") or 0) + 1
        first_fetched_at = str(existing_record.get("fetchedAt") or first_fetched_at)

    if replace_orders:
        merged_items = records
    else:
        merged: dict[str, dict[str, object]] = {}
        for item in existing_items:
            key = _order_merge_key(item)
            if key:
                merged[key] = item
        for item in records:
            key = _order_merge_key(item)
            if key:
                merged[key] = item
        merged_items = sorted(
            merged.values(),
            key=lambda item: str(item.get("go_date") or ""),
            reverse=True,
        )

    department_url = _department_go_url(
        base_url,
        department.dep_id_encoded,
        department.list_year_b64,
    )

    payload: dict[str, object] = {
        "department_name": department.name,
        "dep_id_encoded": department.dep_id_encoded,
        "department_url": department_url,
        "years_fetched": list(years),
        "start_date": _format_display_date(start_date),
        "source_url": source_url,
        "fetchedAt": first_fetched_at,
        "lastFetchedAt": fetched_at,
        "fetchCount": fetch_count,
        "count": len(merged_items),
        "orders": merged_items,
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN Government Orders per department and save JSON files.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_OUTPUT_DIR),
        help="Folder for per-department JSON files.",
    )
    parser.add_argument(
        "--start-date",
        help="Include G.O.s from this date onward (DD-MM-YYYY). Defaults to TN_GO_START_DATE in .env.",
    )
    parser.add_argument(
        "--end-date",
        help="Include G.O.s up to this date (DD-MM-YYYY). Defaults to today (Asia/Kolkata).",
    )
    parser.add_argument(
        "--from-existing",
        action="store_true",
        help="Refresh department JSON files already present in the output folder.",
    )
    parser.add_argument(
        "--replace-orders",
        action="store_true",
        help="Replace the orders array instead of merging with existing entries.",
    )
    args = parser.parse_args()

    source_url, base_url, default_start_date = _load_config()
    output_dir = Path(args.output_dir)

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import build_retry_session
    from sync_state import JOB_GOVERNMENT_ORDERS, record_date_range_sync, resolve_date_range

    start_date, end_date = resolve_date_range(
        JOB_GOVERNMENT_ORDERS,
        output_dir=output_dir,
        default_start_display=default_start_date,
        explicit_start=args.start_date,
        explicit_end=args.end_date,
    )
    if start_date > end_date:
        print(
            f"Government orders already up to date "
            f"(through {_format_display_date(end_date)})."
        )
        return 0

    years = range(start_date.year, end_date.year + 1)

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    print(f"Source list: {source_url}")
    print(
        f"Including G.O.s from {_format_display_date(start_date)} "
        f"to {_format_display_date(end_date)}."
    )

    if args.from_existing:
        department_entries = load_departments_from_existing(output_dir)
        print(f"Refreshing {len(department_entries)} existing department JSON file(s) ...")
    else:
        departments = fetch_departments(session, source_url)
        department_entries = [
            (department, output_dir / f"{_department_slug(department.name, department.dep_id_encoded)}.json")
            for department in departments
        ]
        print(f"Found {len(department_entries)} departments.")

    saved_paths: list[Path] = []
    for index, (department, out_path) in enumerate(department_entries, start=1):
        orders = fetch_department_orders(
            session,
            base_url=base_url,
            department=department,
            source_url=source_url,
            years=years,
            start_date=start_date,
            end_date=end_date,
        )
        saved_path = save_department_json(
            output_dir,
            department=department,
            orders=orders,
            source_url=source_url,
            base_url=base_url,
            years=years,
            start_date=start_date,
            replace_orders=args.replace_orders,
            output_path=out_path,
        )
        saved_paths.append(saved_path)
        print(f"  [{index}/{len(department_entries)}] {department.name}: {len(orders)} order(s) -> {saved_path.name}")
        time.sleep(0.2)

    print(f"Saved {len(saved_paths)} department JSON file(s).")
    record_date_range_sync(JOB_GOVERNMENT_ORDERS, synced_through=end_date)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
