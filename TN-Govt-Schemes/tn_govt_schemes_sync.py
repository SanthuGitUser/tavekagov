"""
Fetch Tamil Nadu government schemes from schemesinindia.in and save to manifests/tn_govt_schemes.json.

Usage:
  1. pip install -r requirements.txt
  2. python tn_govt_schemes_sync.py
  3. Optional: python tn_govt_schemes_sync.py --output-dir path/to/manifests
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, replace
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_KOLKATA = ZoneInfo("Asia/Kolkata")

STATE_SOURCE_URL = "https://schemesinindia.in/schemes/tamil-nadu"
HOUSING_SOURCE_URL = "https://schemesinindia.in/housing"
SCHOLARSHIPS_SOURCE_URL = "https://schemesinindia.in/scholarships"
BASE_URL = "https://schemesinindia.in"

_CARD_RE = re.compile(
    r'<a class="scheme-card[^"]*"\s+href="([^"]+)"(.*?</a>)',
    re.IGNORECASE | re.DOTALL,
)
_CATEGORY_RE = re.compile(
    r'class="category-badge"[^>]*>(.*?)</span>',
    re.IGNORECASE | re.DOTALL,
)
_TITLE_RE = re.compile(
    r"<h3[^>]*>(.*?)</h3>",
    re.IGNORECASE | re.DOTALL,
)
_BENEFIT_RE = re.compile(
    r'class="text-xs font-semibold text-\[#128807\][^"]*"[^>]*>(.*?)</span>',
    re.IGNORECASE | re.DOTALL,
)
_UPDATED_RE = re.compile(
    r"Updated\s*<!--\s*-->\s*([A-Za-z]+\s+\d{4})",
    re.IGNORECASE,
)
_SCHOLARSHIP_CARD_RE = re.compile(
    r'<a[^>]+href="(/scholarships/[^"]+)"[^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
_SCHOLARSHIP_SUMMARY_RE = re.compile(
    r'<p class="[^"]*line-clamp[^"]*"[^>]*>(.*?)</p>',
    re.IGNORECASE | re.DOTALL,
)
_SCHOLARSHIP_LEVEL_RE = re.compile(
    r"📚\s*<!--\s*-->\s*([^<]+)",
    re.IGNORECASE,
)
_JSON_LD_RE = re.compile(
    r'<script type="application/ld\+json">(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
_DETAIL_BENEFIT_RE = re.compile(
    r'class="[^"]*text-\[#128807\][^"]*"[^>]*>(.*?)</span>',
    re.IGNORECASE | re.DOTALL,
)
_MONTH_NAMES = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}
_UPDATED_LABEL_RE = re.compile(
    r"(\d{1,2}\s+)?([A-Za-z]+)\s+(\d{4})",
    re.IGNORECASE,
)
_DATE_TIME_RE = re.compile(r'dateTime="(\d{4}-\d{2}-\d{2})"')
_TAG_RE = re.compile(r"<[^>]+>")
_TN_RE = re.compile(
    r"tamil\s*nadu|tnhb|\bchennai\b|coimbatore|madurai|tiruchir|trichy|salem|tirunelveli",
    re.IGNORECASE,
)
_EXCLUDED_SCHOLARSHIP_IDS = frozenset(
    {
        "ishan-uday-northeast-students",
    }
)
_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


@dataclass(frozen=True)
class GovtScheme:
    id: str
    title: str
    category: str
    benefit_summary: str
    updated_label: str | None
    is_popular: bool
    detail_url: str
    display_order: int
    section: str


def _clean_text(value: str) -> str:
    text = html.unescape(_TAG_RE.sub(" ", value or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text.replace("✅", "").strip()


def _category_label(raw: str) -> str:
    cleaned = _clean_text(raw)
    return re.sub(r"^[\U0001F300-\U0001FAFF]\s*", "", cleaned).strip()


def _scheme_id(href: str) -> str:
    slug = href.rstrip("/").split("/")[-1]
    return slug or href


def _is_state_scheme(href: str) -> bool:
    return href.startswith("/schemes/tamil-nadu/")


def _strip_truncation(value: str) -> str:
    return value.rstrip("…").rstrip("...").strip()


def _is_mostly_english(value: str) -> bool:
    letters = [char for char in value if char.isalpha()]
    if not letters:
        return False
    ascii_letters = sum(1 for char in letters if ord(char) < 128)
    return ascii_letters / len(letters) > 0.7


def _is_tamil_nadu_related(*parts: str) -> bool:
    combined = " ".join(part for part in parts if part)
    return bool(_TN_RE.search(combined))


def _format_updated_label(raw_date: str) -> str | None:
    value = raw_date.strip()
    if not value:
        return None

    iso_match = re.match(r"(\d{4})-(\d{2})-(\d{2})", value)
    if iso_match:
        year, month, day = (int(part) for part in iso_match.groups())
        month_name = datetime(year, month, day, tzinfo=_KOLKATA).strftime("%b")
        if day == 1:
            return f"{month_name} {year}"
        return f"{day} {month_name} {year}"

    label_match = _UPDATED_LABEL_RE.search(value)
    if label_match:
        day_part, month_name, year = label_match.groups()
        month_key = month_name[:3].lower()
        if month_key not in _MONTH_NAMES:
            return None
        normalized_month = datetime(2000, _MONTH_NAMES[month_key], 1).strftime("%b")
        if day_part:
            return f"{day_part.strip()} {normalized_month} {year}"
        return f"{normalized_month} {year}"

    return None


def _extract_updated_label(page_html: str, fallback: str | None = None) -> str | None:
    for script in _JSON_LD_RE.findall(page_html):
        try:
            data = json.loads(script)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "Article":
            for key in ("dateModified", "datePublished"):
                formatted = _format_updated_label(str(data.get(key) or ""))
                if formatted:
                    return formatted

    date_time_match = _DATE_TIME_RE.search(page_html)
    if date_time_match:
        formatted = _format_updated_label(date_time_match.group(1))
        if formatted:
            return formatted

    return _format_updated_label(fallback or "") if fallback else None


def _extract_article(page_html: str) -> tuple[str, str]:
    for script in _JSON_LD_RE.findall(page_html):
        try:
            data = json.loads(script)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "Article":
            headline = _clean_text(str(data.get("headline") or ""))
            description = _strip_truncation(_clean_text(str(data.get("description") or "")))
            return headline, description
    return "", ""


def _extract_detail_benefit(page_html: str) -> str | None:
    headline, description = _extract_article(page_html)
    if description:
        return description

    for match in _DETAIL_BENEFIT_RE.findall(page_html):
        text = _strip_truncation(_clean_text(match))
        if not text or text in {"🎯", "✅"}:
            continue
        if " Category " in text:
            text = text.split(" Category ", 1)[0].strip()
        if _is_mostly_english(text) and len(text) > 20:
            return text

    return None


def _extract_housing_links(page_html: str) -> list[tuple[str, str]]:
    entries: dict[str, str] = {}

    for script in _JSON_LD_RE.findall(page_html):
        try:
            data = json.loads(script)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, dict) or data.get("@type") != "ItemList":
            continue
        for item in data.get("itemListElement", []):
            if not isinstance(item, dict):
                continue
            url = str(item.get("url") or "")
            name = _clean_text(str(item.get("name") or ""))
            if not url.startswith(BASE_URL + "/housing/"):
                continue
            href = url.removeprefix(BASE_URL)
            entries[href] = name or href

    for href in re.findall(r'href="(/housing/[^"]+)"', page_html):
        if href in entries:
            continue
        idx = page_html.find(f'href="{href}"')
        context = page_html[max(0, idx - 300) : idx + 500] if idx >= 0 else href
        title_match = re.search(r'title="([^"]+)"', context, re.I)
        title = _clean_text(title_match.group(1)) if title_match else href
        entries[href] = title

    return [
        (href, title)
        for href, title in entries.items()
        if _is_tamil_nadu_related(href, title)
    ]


def parse_state_schemes(page_html: str) -> list[GovtScheme]:
    schemes: list[GovtScheme] = []
    for match in _CARD_RE.finditer(page_html):
        href, body = match.groups()
        href = href.strip()
        if not _is_state_scheme(href):
            continue

        category_match = _CATEGORY_RE.search(body)
        title_match = _TITLE_RE.search(body)
        benefit_match = _BENEFIT_RE.search(body)
        updated_match = _UPDATED_RE.search(body)

        title = _clean_text(title_match.group(1) if title_match else "")
        if not title:
            continue

        schemes.append(
            GovtScheme(
                id=_scheme_id(href),
                title=title,
                category=_category_label(category_match.group(1) if category_match else "General"),
                benefit_summary=_clean_text(benefit_match.group(1) if benefit_match else ""),
                updated_label=updated_match.group(1).strip() if updated_match else None,
                is_popular='class="popular-badge"' in body or "popular-badge" in body,
                detail_url=urljoin(BASE_URL, href),
                display_order=len(schemes) + 1,
                section="state",
            )
        )

    if not schemes:
        raise RuntimeError("No state schemes found — the source page layout may have changed.")

    return schemes


def parse_housing_schemes(page_html: str) -> list[GovtScheme]:
    schemes: list[GovtScheme] = []
    seen_ids: set[str] = set()
    for href, listing_title in _extract_housing_links(page_html):
        scheme_id = _scheme_id(href)
        if scheme_id in seen_ids:
            continue
        seen_ids.add(scheme_id)
        schemes.append(
            GovtScheme(
                id=scheme_id,
                title=listing_title,
                category="Housing",
                benefit_summary="",
                updated_label=None,
                is_popular=False,
                detail_url=urljoin(BASE_URL, href),
                display_order=len(schemes) + 1,
                section="housing",
            )
        )
    return schemes


def parse_scholarship_schemes(page_html: str) -> list[GovtScheme]:
    schemes: list[GovtScheme] = []
    seen_ids: set[str] = set()
    for match in _SCHOLARSHIP_CARD_RE.finditer(page_html):
        href, body = match.groups()
        scheme_id = _scheme_id(href)
        if scheme_id in _EXCLUDED_SCHOLARSHIP_IDS or scheme_id in seen_ids:
            continue
        seen_ids.add(scheme_id)

        title_match = _TITLE_RE.search(body)
        summary_match = _SCHOLARSHIP_SUMMARY_RE.search(body)
        level_match = _SCHOLARSHIP_LEVEL_RE.search(body)

        title = _clean_text(title_match.group(1) if title_match else scheme_id)
        if not title:
            continue

        schemes.append(
            GovtScheme(
                id=scheme_id,
                title=title,
                category=_clean_text(level_match.group(1) if level_match else "Scholarships"),
                benefit_summary=_clean_text(summary_match.group(1) if summary_match else ""),
                updated_label=None,
                is_popular="POPULAR" in body or "popular-badge" in body,
                detail_url=urljoin(BASE_URL, href),
                display_order=len(schemes) + 1,
                section="scholarships",
            )
        )

    return schemes


def enrich_scheme_benefits(
    schemes: list[GovtScheme],
    session: requests.Session,
    *,
    referer: str,
    timeout: tuple[float, float],
) -> list[GovtScheme]:
    enriched: list[GovtScheme] = []
    total = len(schemes)
    for index, scheme in enumerate(schemes, start=1):
        benefit_summary = _strip_truncation(scheme.benefit_summary)
        title = scheme.title
        updated_label = scheme.updated_label
        try:
            response = session.get(
                scheme.detail_url,
                timeout=timeout,
                headers={"Referer": referer},
            )
            response.raise_for_status()
            article_title, article_description = _extract_article(response.text)
            if article_title:
                title = article_title
            detail_benefit = article_description or _extract_detail_benefit(response.text)
            if detail_benefit:
                benefit_summary = detail_benefit
            detail_updated = _extract_updated_label(response.text, scheme.updated_label)
            if detail_updated:
                updated_label = detail_updated
        except requests.RequestException as exc:
            print(f"  [{index}/{total}] Warning: could not fetch {scheme.id}: {exc}")

        enriched.append(
            replace(
                scheme,
                title=title,
                benefit_summary=benefit_summary,
                updated_label=updated_label,
            )
        )
        if index < total:
            time.sleep(0.2)

    return enriched


def fetch_all_schemes(
    session: requests.Session,
    *,
    timeout: tuple[float, float],
) -> list[GovtScheme]:
    state_response = session.get(STATE_SOURCE_URL, timeout=timeout)
    state_response.raise_for_status()
    state_schemes = parse_state_schemes(state_response.text)
    print(f"Fetching full descriptions for {len(state_schemes)} state schemes...")
    state_schemes = enrich_scheme_benefits(
        state_schemes,
        session,
        referer=STATE_SOURCE_URL,
        timeout=timeout,
    )

    housing_response = session.get(HOUSING_SOURCE_URL, timeout=timeout)
    housing_response.raise_for_status()
    housing_schemes = parse_housing_schemes(housing_response.text)
    print(f"Found {len(housing_schemes)} Tamil Nadu housing schemes...")
    if housing_schemes:
        housing_schemes = enrich_scheme_benefits(
            housing_schemes,
            session,
            referer=HOUSING_SOURCE_URL,
            timeout=timeout,
        )

    scholarships_response = session.get(SCHOLARSHIPS_SOURCE_URL, timeout=timeout)
    scholarships_response.raise_for_status()
    scholarship_schemes = parse_scholarship_schemes(scholarships_response.text)
    print(f"Found {len(scholarship_schemes)} Tamil Nadu scholarships...")
    if scholarship_schemes:
        scholarship_schemes = enrich_scheme_benefits(
            scholarship_schemes,
            session,
            referer=SCHOLARSHIPS_SOURCE_URL,
            timeout=timeout,
        )

    order_offset = 0
    combined: list[GovtScheme] = []
    for group in (state_schemes, housing_schemes, scholarship_schemes):
        for scheme in group:
            order_offset += 1
            combined.append(replace(scheme, display_order=order_offset))

    return combined


def write_manifest(schemes: list[GovtScheme], *, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "tn_govt_schemes.json"
    state_count = sum(1 for scheme in schemes if scheme.section == "state")
    housing_count = sum(1 for scheme in schemes if scheme.section == "housing")
    scholarships_count = sum(1 for scheme in schemes if scheme.section == "scholarships")
    payload = {
        "source_urls": {
            "state": STATE_SOURCE_URL,
            "housing": HOUSING_SOURCE_URL,
            "scholarships": SCHOLARSHIPS_SOURCE_URL,
        },
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(schemes),
        "state_count": state_count,
        "housing_count": housing_count,
        "scholarships_count": scholarships_count,
        "schemes": [asdict(scheme) for scheme in schemes],
    }
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from write_utils import write_json_if_changed

    write_json_if_changed(path, payload, volatile_top_level_keys={"fetchedAt"})
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch TN government schemes and save tn_govt_schemes.json.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_MANIFESTS_DIR),
        help="Folder for tn_govt_schemes.json (default: manifests/).",
    )
    args = parser.parse_args()

    print("Fetching Tamil Nadu schemes from Schemes in India ...")
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    try:
        schemes = fetch_all_schemes(session, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    except requests.RequestException as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    manifest_path = write_manifest(schemes, output_dir=Path(args.output_dir))
    state_count = sum(1 for scheme in schemes if scheme.section == "state")
    housing_count = sum(1 for scheme in schemes if scheme.section == "housing")
    scholarships_count = sum(1 for scheme in schemes if scheme.section == "scholarships")
    print(
        f"Parsed {len(schemes)} schemes "
        f"({state_count} state, {housing_count} housing, {scholarships_count} scholarships)."
    )
    print(f"Wrote manifest: {manifest_path}")
    from sync_state import JOB_GOVT_SCHEMES, record_sync

    record_sync(JOB_GOVT_SCHEMES, extra={"count": len(schemes)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
