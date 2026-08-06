"""
Fetch Tamil Nadu districts from tn.gov.in and save to manifests/tn_districts.json.

Usage:
  1. pip install -r requirements.txt
  2. python tn_districts_sync.py
  3. Optional: python tn_districts_sync.py --output-dir path/to/manifests
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_KOLKATA = ZoneInfo("Asia/Kolkata")

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


def _load_config() -> tuple[str, str]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_districts_source_url, get_tn_gov_base_url

    return get_tn_districts_source_url(), get_tn_gov_base_url()


def _district_profile_url(base_url: str, dt_cd_encoded: str) -> str:
    return urljoin(base_url, f"district1.php?dt_cd={dt_cd_encoded}")


@dataclass(frozen=True)
class District:
    id: int
    name: str
    dt_cd_encoded: str
    profile_url: str
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
    timeout: tuple[float, float],
) -> tuple[str, str | None, str | None, str | None]:
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            response = session.get(
                profile_url,
                timeout=timeout,
                headers={"Referer": source_url},
            )
            if not response.text.strip():
                response.raise_for_status()

            page_html = response.text
            name = _extract_first(_NAME_RE, page_html) or fallback_name
            area_size = _extract_first(_AREA_RE, page_html)
            population = _extract_first(_POPULATION_RE, page_html)
            website_match = _WEBSITE_RE.search(page_html)
            website_url = website_match.group(1).strip() if website_match else None
            return name, area_size, population, website_url

        except requests.RequestException as exc:
            last_error = exc
            if attempt < 3:
                time.sleep(attempt)

    print(f"    Warning: could not fetch district profile {profile_url}: {last_error}")
    return fallback_name, None, None, None


def fetch_districts(
    session: requests.Session,
    *,
    timeout: tuple[float, float],
) -> list[District]:
    source_url, base_url = _load_config()
    response = session.get(source_url, timeout=timeout)
    response.raise_for_status()
    page_html = response.text

    entries: list[tuple[int, str, str, int]] = []
    for order, match in enumerate(_CARD_RE.finditer(page_html), start=1):
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
            profile_url,
            list_name,
            session,
            source_url=source_url,
            timeout=timeout,
        )
        districts.append(
            District(
                id=district_id,
                name=name,
                dt_cd_encoded=dt_cd_encoded,
                profile_url=profile_url,
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


def write_manifest(districts: list[District], *, output_dir: Path) -> Path:
    source_url, _ = _load_config()
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "tn_districts.json"
    payload = {
        "source_url": source_url,
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(districts),
        "districts": [asdict(district) for district in districts],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN districts and save tn_districts.json.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_MANIFESTS_DIR),
        help="Folder for tn_districts.json (default: manifests/).",
    )
    args = parser.parse_args()

    source_url, _ = _load_config()
    print(f"Fetching districts from {source_url} ...")
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    try:
        districts = fetch_districts(session, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    except requests.RequestException as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    manifest_path = write_manifest(districts, output_dir=Path(args.output_dir))
    print(f"Parsed {len(districts)} districts.")
    print(f"Wrote manifest: {manifest_path}")
    from sync_state import JOB_DISTRICTS, record_sync

    record_sync(JOB_DISTRICTS)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
