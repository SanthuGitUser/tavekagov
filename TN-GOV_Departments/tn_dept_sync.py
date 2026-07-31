"""
Fetch Tamil Nadu government departments from tn.gov.in and upsert into Supabase.

Usage:
  1. Ensure Public DB/.env has Supabase keys (see Public DB/.env.example).
  2. pip install -r requirements.txt
  3. python tn_dept_sync.py
  4. Optional: python tn_dept_sync.py --dry-run
"""

from __future__ import annotations

import argparse
import base64
import html
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from urllib.parse import urljoin

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_MINISTERS_MANIFEST = _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json"

_CARD_RE = re.compile(
    r"<a\s+class=['\"]go2-card1['\"]\s+href=['\"]([^'\"]+)['\"][^>]*>"
    r".*?<img\s+src=['\"]([^'\"]+)['\"][^>]*>"
    r".*?<h3>(.*?)</h3>",
    re.IGNORECASE | re.DOTALL,
)
_DEP_ID_RE = re.compile(r"dep_id=([^&'\"]+)")
_MINISTER_NAME_RE = re.compile(
    r"minister_title[^>]*>\s*Minister\s*</div>.*?<h4[^>]*>(.*?)</h4>",
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def _load_config():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import get_tn_dept_source_url, get_tn_gov_base_url

    return get_tn_dept_source_url(), get_tn_gov_base_url()


def _dept_profile_url(base_url: str, dep_id_encoded: str) -> str:
    return urljoin(base_url, f"dept_profile.php?dep_id={dep_id_encoded}")


@dataclass(frozen=True)
class MinisterRecord:
    name: str
    designation: str
    portfolio: str
    is_chief_minister: bool


def _normalize_text(value: str) -> str:
    text = html.unescape(value or "")
    text = _TAG_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def _department_keywords(department_name: str) -> list[str]:
    cleaned = _normalize_text(department_name.replace("Department", ""))
    keywords = [cleaned]
    if "mudalvarin" in cleaned or "mugavari" in cleaned:
        keywords.extend(["mudalvarin mugavari", "mudalvarin", "mugavari"])
    if "social reforms" in cleaned:
        keywords.extend(["social reforms", "social reform"])
    return keywords


def _load_ministers() -> list[MinisterRecord]:
    if not _MINISTERS_MANIFEST.exists():
        return []

    payload = json.loads(_MINISTERS_MANIFEST.read_text(encoding="utf-8"))
    return [
        MinisterRecord(
            name=item["name"],
            designation=item.get("designation", ""),
            portfolio=item.get("portfolio", ""),
            is_chief_minister=bool(item.get("is_chief_minister")),
        )
        for item in payload.get("ministers", [])
    ]


def match_minister_from_portfolio(
    department_name: str,
    ministers: list[MinisterRecord],
) -> str | None:
    keywords = _department_keywords(department_name)
    normalized_name = _normalize_text(department_name)

    if "mudalvarin" in normalized_name or "mugavari" in normalized_name:
        for minister in ministers:
            if minister.is_chief_minister:
                return minister.name

    best_name: str | None = None
    best_score = 0
    for minister in ministers:
        blob = _normalize_text(f"{minister.designation} {minister.portfolio}")
        score = sum(1 for keyword in keywords if keyword and keyword in blob)
        if score > best_score:
            best_score = score
            best_name = minister.name

    return best_name if best_score > 0 else None


@dataclass(frozen=True)
class Department:
    id: int
    name: str
    dep_id_encoded: str
    minister_name: str | None
    display_order: int


def _decode_dep_id(encoded: str) -> int:
    padded = encoded + ("=" * (-len(encoded) % 4))
    raw = base64.b64decode(padded).decode("utf-8")
    return int(raw)


def _clean_name(name: str) -> str:
    text = re.sub(r"\s+", " ", name)
    return text.replace("→", "").strip()


def _clean_minister_name(name: str) -> str:
    text = _TAG_RE.sub(" ", name or "")
    return re.sub(r"\s+", " ", text).strip()


def fetch_minister_name(
    profile_url: str,
    session: requests.Session,
    *,
    source_url: str,
) -> str | None:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            response = session.get(
                profile_url,
                timeout=(20, 60),
                headers={"Referer": source_url},
            )
            if not response.text.strip():
                response.raise_for_status()

            match = _MINISTER_NAME_RE.search(response.text)
            if match:
                cleaned = _clean_minister_name(match.group(1))
                return cleaned or None

            if response.ok:
                return None

            response.raise_for_status()
        except requests.RequestException as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(attempt)
    print(f"    Warning: could not fetch minister from {profile_url}: {last_error}")
    return None


def fetch_departments(session: requests.Session | None = None) -> list[Department]:
    source_url, base_url = _load_config()
    sess = session or requests.Session()
    sess.headers.update(_DEFAULT_HEADERS)
    response = sess.get(source_url, timeout=(20, 60))
    response.raise_for_status()
    html = response.text

    departments: list[Department] = []
    for order, match in enumerate(_CARD_RE.finditer(html), start=1):
        href, _icon_src, raw_name = match.groups()
        dep_match = _DEP_ID_RE.search(href)
        if not dep_match:
            continue

        dep_id_encoded = dep_match.group(1)
        departments.append(
            Department(
                id=_decode_dep_id(dep_id_encoded),
                name=_clean_name(raw_name),
                dep_id_encoded=dep_id_encoded,
                minister_name=None,
                display_order=order,
            )
        )

    if not departments:
        raise RuntimeError("No departments found — the source page layout may have changed.")

    print(f"Fetching minister names from {len(departments)} department profiles...")
    ministers = _load_ministers()
    enriched: list[Department] = []
    for index, dept in enumerate(departments, start=1):
        profile_url = _dept_profile_url(base_url, dept.dep_id_encoded)
        minister_name = fetch_minister_name(profile_url, sess, source_url=source_url)
        if not minister_name and ministers:
            minister_name = match_minister_from_portfolio(dept.name, ministers)
            if minister_name:
                print(f"    Matched minister from portfolio: {minister_name}")
        enriched.append(
            Department(
                id=dept.id,
                name=dept.name,
                dep_id_encoded=dept.dep_id_encoded,
                minister_name=minister_name,
                display_order=dept.display_order,
            )
        )
        status = minister_name or "(none)"
        print(f"  [{index}/{len(departments)}] {dept.name}: {status}")
        time.sleep(0.3)

    return enriched


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_departments(departments: list[Department]) -> int:
    client = _load_supabase_client()
    rows = [
        {
            "id": dept.id,
            "name": dept.name,
            "dep_id_encoded": dept.dep_id_encoded,
            "minister_name": dept.minister_name,
            "display_order": dept.display_order,
        }
        for dept in departments
    ]
    client.table("tn_dept").upsert(rows, on_conflict="id").execute()
    return len(rows)


def write_manifest(departments: list[Department]) -> Path:
    source_url, _ = _load_config()
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _MANIFESTS_DIR / "tn_departments.json"
    payload = {
        "source_url": source_url,
        "count": len(departments),
        "departments": [asdict(dept) for dept in departments],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync TN government departments to Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    args = parser.parse_args()

    print(f"Fetching departments from {_load_config()[0]} ...")
    departments = fetch_departments()
    print(f"Parsed {len(departments)} departments.")

    manifest_path = write_manifest(departments)
    print(f"Wrote manifest: {manifest_path}")

    if args.dry_run:
        print("Dry run complete (no database changes).")
        return 0

    count = upsert_departments(departments)
    print(f"Upserted {count} rows into public.tn_dept.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
