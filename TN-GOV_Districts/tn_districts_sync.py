"""
Fetch Tamil Nadu districts from tn.gov.in and upsert into Supabase.

Usage:
  1. Ensure Public DB/.env has Supabase keys (see Public DB/.env.example).
  2. pip install -r requirements.txt
  3. python tn_districts_sync.py
  4. Optional: python tn_districts_sync.py --dry-run
"""

from __future__ import annotations

import argparse
import base64
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

_CARD_RE = re.compile(
    r"<a\s+href=district1\.php\?dt_cd=([^>\s]+)>\s*"
    r".*?dis_list_card_title[^>]*>\s*(.*?)\s*</div>",
    re.IGNORECASE | re.DOTALL,
)
_NAME_RE = re.compile(
    r'id="title_con"[^>]*>.*?<p[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)
_AREA_RE = re.compile(
    r'id="area_content"[^>]*>.*?<p[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)
_POPULATION_RE = re.compile(
    r'id="pop_content"[^>]*>.*?<p[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)
_WEBSITE_RE = re.compile(
    r'id="dist_content"[^>]*>.*?<a[^>]+href=["\']([^"\']+)["\']',
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
    from config import get_tn_districts_source_url, get_tn_gov_base_url

    return get_tn_districts_source_url(), get_tn_gov_base_url()


def _district_profile_url(base_url: str, dt_cd_encoded: str) -> str:
    return urljoin(base_url, f"district1.php?dt_cd={dt_cd_encoded}")


@dataclass(frozen=True)
class District:
    id: int
    name: str
    dt_cd_encoded: str
    area_size: str | None
    population: str | None
    website_url: str | None
    display_order: int


def _decode_dt_cd(encoded: str) -> int:
    padded = encoded + ("=" * (-len(encoded) % 4))
    raw = base64.b64decode(padded).decode("utf-8")
    return int(raw)


def _clean_text(value: str) -> str:
    text = _TAG_RE.sub(" ", value or "")
    return re.sub(r"\s+", " ", text).strip()


def _extract_first(pattern: re.Pattern[str], html: str) -> str | None:
    match = pattern.search(html)
    if not match:
        return None
    cleaned = _clean_text(match.group(1))
    return cleaned or None


def fetch_district_details(
    profile_url: str,
    fallback_name: str,
    session: requests.Session,
    *,
    source_url: str,
) -> tuple[str, str | None, str | None, str | None]:
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

            html = response.text
            name = _extract_first(_NAME_RE, html) or fallback_name
            area_size = _extract_first(_AREA_RE, html)
            population = _extract_first(_POPULATION_RE, html)
            website_match = _WEBSITE_RE.search(html)
            website_url = website_match.group(1).strip() if website_match else None
            return name, area_size, population, website_url

        except requests.RequestException as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(attempt)

    print(f"    Warning: could not fetch district profile {profile_url}: {last_error}")
    return fallback_name, None, None, None


def fetch_districts(session: requests.Session | None = None) -> list[District]:
    source_url, base_url = _load_config()
    sess = session or requests.Session()
    sess.headers.update(_DEFAULT_HEADERS)
    response = sess.get(source_url, timeout=(20, 60))
    response.raise_for_status()
    html = response.text

    entries: list[tuple[int, str, str, int]] = []
    for order, match in enumerate(_CARD_RE.finditer(html), start=1):
        dt_cd_encoded, raw_name = match.groups()
        dt_cd_encoded = dt_cd_encoded.strip()
        list_name = _clean_text(raw_name)
        entries.append((_decode_dt_cd(dt_cd_encoded), list_name, dt_cd_encoded, order))

    if not entries:
        raise RuntimeError("No districts found — the source page layout may have changed.")

    print(f"Fetching details from {len(entries)} district profiles...")
    districts: list[District] = []
    for index, (district_id, list_name, dt_cd_encoded, display_order) in enumerate(
        entries, start=1
    ):
        profile_url = _district_profile_url(base_url, dt_cd_encoded)
        name, area_size, population, website_url = fetch_district_details(
            profile_url, list_name, sess, source_url=source_url
        )
        districts.append(
            District(
                id=district_id,
                name=name,
                dt_cd_encoded=dt_cd_encoded,
                area_size=area_size,
                population=population,
                website_url=website_url,
                display_order=display_order,
            )
        )
        print(
            f"  [{index}/{len(entries)}] {name}: "
            f"area={area_size or '(none)'}, pop={population or '(none)'}, "
            f"site={website_url or '(none)'}"
        )
        time.sleep(0.3)

    return districts


def _load_supabase_client():
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from client import get_supabase_client

    return get_supabase_client(use_service_role=True)


def upsert_districts(districts: list[District]) -> int:
    client = _load_supabase_client()
    rows = [
        {
            "id": district.id,
            "name": district.name,
            "dt_cd_encoded": district.dt_cd_encoded,
            "area_size": district.area_size,
            "population": district.population,
            "website_url": district.website_url,
            "display_order": district.display_order,
        }
        for district in districts
    ]
    client.table("tn_districts").upsert(rows, on_conflict="id").execute()
    return len(rows)


def write_manifest(districts: list[District]) -> Path:
    _MANIFESTS_DIR.mkdir(parents=True, exist_ok=True)
    path = _MANIFESTS_DIR / "tn_districts.json"
    payload = {
        "source_url": _load_config()[0],
        "count": len(districts),
        "districts": [asdict(district) for district in districts],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync TN districts to Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and write manifest only; do not upsert to Supabase.",
    )
    args = parser.parse_args()

    print(f"Fetching districts from {_load_config()[0]} ...")
    districts = fetch_districts()
    print(f"Parsed {len(districts)} districts.")

    manifest_path = write_manifest(districts)
    print(f"Wrote manifest: {manifest_path}")

    if args.dry_run:
        print("Dry run complete (no database changes).")
        return 0

    count = upsert_districts(districts)
    print(f"Upserted {count} rows into public.tn_districts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
