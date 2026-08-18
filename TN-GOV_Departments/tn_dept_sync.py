"""
Fetch Tamil Nadu government departments from tn.gov.in and save to manifests/tn_departments.json.

Usage:
  1. pip install -r requirements.txt
  2. python tn_dept_sync.py
  3. Optional: python tn_dept_sync.py --output-dir path/to/manifests

Minister portfolio fallback uses TN-GOV_Council Of Ministers/manifests/tn_ministers.json when
department profile pages do not expose a minister name.
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
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_MINISTERS_MANIFEST = _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json"
_KOLKATA = ZoneInfo("Asia/Kolkata")

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


def _load_config() -> tuple[str, str]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_dept_source_url, get_tn_gov_base_url

    return get_tn_dept_source_url(), get_tn_gov_base_url()


def _absolute_url(base_url: str, value: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return ""
    if raw.lower().startswith("http://") or raw.lower().startswith("https://"):
        return raw
    return urljoin(base_url, raw)


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
    profile_url: str
    icon_url: str | None
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
    timeout: tuple[float, float],
) -> str | None:
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


def fetch_departments(
    session: requests.Session,
    *,
    timeout: tuple[float, float],
) -> list[Department]:
    source_url, base_url = _load_config()
    response = session.get(source_url, timeout=timeout)
    response.raise_for_status()
    page_html = response.text

    departments: list[Department] = []
    for order, match in enumerate(_CARD_RE.finditer(page_html), start=1):
        href, icon_src, raw_name = match.groups()
        dep_match = _DEP_ID_RE.search(href)
        if not dep_match:
            continue

        dep_id_encoded = dep_match.group(1)
        profile_url = _absolute_url(base_url, href)
        if "dep_id=" not in profile_url:
            profile_url = _dept_profile_url(base_url, dep_id_encoded)

        departments.append(
            Department(
                id=_decode_dep_id(dep_id_encoded),
                name=_clean_name(raw_name),
                dep_id_encoded=dep_id_encoded,
                profile_url=profile_url,
                icon_url=_absolute_url(base_url, icon_src) or None,
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
        minister_name = fetch_minister_name(
            dept.profile_url,
            session,
            source_url=source_url,
            timeout=timeout,
        )
        if not minister_name and ministers:
            minister_name = match_minister_from_portfolio(dept.name, ministers)
            if minister_name:
                print(f"    Matched minister from portfolio: {minister_name}")
        enriched.append(
            Department(
                id=dept.id,
                name=dept.name,
                dep_id_encoded=dept.dep_id_encoded,
                profile_url=dept.profile_url,
                icon_url=dept.icon_url,
                minister_name=minister_name,
                display_order=dept.display_order,
            )
        )
        status = minister_name or "(none)"
        print(f"  [{index}/{len(departments)}] {dept.name}: {status}")
        time.sleep(0.3)

    return enriched


def write_manifest(departments: list[Department], *, output_dir: Path) -> Path:
    source_url, _ = _load_config()
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "tn_departments.json"
    payload = {
        "source_url": source_url,
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(departments),
        "departments": [asdict(dept) for dept in departments],
    }
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from write_utils import write_json_if_changed

    wrote = write_json_if_changed(path, payload, volatile_top_level_keys={"fetchedAt"})
    if not wrote:
        return path
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN government departments and save tn_departments.json.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_MANIFESTS_DIR),
        help="Folder for tn_departments.json (default: manifests/).",
    )
    args = parser.parse_args()

    source_url, _ = _load_config()
    print(f"Fetching departments from {source_url} ...")
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    try:
        departments = fetch_departments(session, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    except requests.RequestException as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    manifest_path = write_manifest(departments, output_dir=Path(args.output_dir))
    print(f"Parsed {len(departments)} departments.")
    print(f"Wrote manifest: {manifest_path}")
    from sync_state import JOB_DEPARTMENTS, record_sync

    record_sync(JOB_DEPARTMENTS)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
