"""
Fetch Tamil Nadu 17th Assembly constituencies from assembly.tn.gov.in.

Sources:
  - https://assembly.tn.gov.in/17thassembly_members.php  (AC no, name, member, party, email)
  - https://assembly.tn.gov.in/17thassembly/members.php  (address, phone, photo)

Usage:
  pip install -r requirements.txt
  python tn_constituencies_sync.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
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

LIST_URL = "https://assembly.tn.gov.in/17thassembly_members.php"
DETAIL_URL = "https://assembly.tn.gov.in/17thassembly/members.php"
DETAIL_BASE_URL = "https://assembly.tn.gov.in/17thassembly/"

_TAG_RE = re.compile(r"<[^>]+>")
_ROW_RE = re.compile(r"<tr[^>]*>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
_CELL_RE = re.compile(r"<t[dh][^>]*>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)
_IMG_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)
_EMAIL_RE = re.compile(r"[a-z0-9._%+-]+@tn\.gov\.in", re.IGNORECASE)
_RESERVED_RE = re.compile(r"\((SC|ST)\)", re.IGNORECASE)

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}


def _clean_html(value: str) -> str:
    text = _TAG_RE.sub(" ", value or "")
    text = text.replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def _normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _parse_reserved_category(constituency_name: str) -> str | None:
    match = _RESERVED_RE.search(constituency_name)
    return match.group(1).upper() if match else None


def _strip_reserved_suffix(name: str) -> str:
    return re.sub(r"\s*\((SC|ST)\)\s*$", "", name, flags=re.IGNORECASE).strip()


@dataclass(frozen=True)
class ConstituencyDetail:
    member_display_name: str | None
    address: str | None
    phone: str | None
    email: str | None
    photo_url: str | None
    is_minister: bool


@dataclass(frozen=True)
class Constituency:
    ac_number: int
    name: str
    district: str | None
    member_name: str
    party: str | None
    email: str | None
    member_display_name: str | None
    address: str | None
    phone: str | None
    photo_url: str | None
    is_minister: bool
    reserved_category: str | None
    profile_url: str
    display_order: int


def _parse_detail_rows(html: str) -> dict[str, ConstituencyDetail]:
    by_email: dict[str, ConstituencyDetail] = {}
    for row in _ROW_RE.findall(html):
        cells = [_clean_html(cell) for cell in _CELL_RE.findall(row)]
        if len(cells) < 5:
            continue
        if not cells[0].isdigit():
            continue

        raw_name_html = _CELL_RE.findall(row)[1] if len(_CELL_RE.findall(row)) > 1 else ""
        name_text = _clean_html(raw_name_html)
        if not name_text:
            continue

        address = cells[2] or None
        phone = cells[3] or None
        email_match = _EMAIL_RE.search(" ".join(cells))
        email = email_match.group(0).lower() if email_match else None

        img_match = _IMG_RE.search(row)
        photo_url = None
        if img_match:
            photo_path = img_match.group(1).strip()
            if photo_path and "members/" in photo_path.lower():
                photo_url = urljoin(DETAIL_BASE_URL, photo_path)

        is_minister = "(minister)" in name_text.lower()
        detail = ConstituencyDetail(
            member_display_name=name_text or None,
            address=address,
            phone=phone,
            email=email,
            photo_url=photo_url,
            is_minister=is_minister,
        )
        if email:
            by_email[email] = detail
    return by_email


def _parse_list_rows(html: str) -> list[tuple[int, str, str, str | None, str | None]]:
    rows: list[tuple[int, str, str, str | None, str | None]] = []
    for row in _ROW_RE.findall(html):
        cells = [_clean_html(cell) for cell in _CELL_RE.findall(row)]
        if len(cells) < 4:
            continue
        if not cells[0].isdigit():
            continue
        ac_number = int(cells[0])
        constituency_name = cells[1]
        member_name = cells[2]
        party = cells[3] or None
        email = None
        if len(cells) > 4:
            email_match = _EMAIL_RE.search(cells[4])
            email = email_match.group(0).lower() if email_match else None
        rows.append((ac_number, constituency_name, member_name, party, email))
    return rows


def fetch_constituencies(session: requests.Session, *, timeout: tuple[float, float]) -> list[Constituency]:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import build_retry_session

    if str(_REPO_ROOT / "TN-Map") not in sys.path:
        sys.path.insert(0, str(_REPO_ROOT / "TN-Map"))
    from build_constituency_counts import AC_TO_DISTRICT

    list_response = session.get(LIST_URL, timeout=timeout, headers=_DEFAULT_HEADERS)
    list_response.raise_for_status()
    detail_response = session.get(DETAIL_URL, timeout=timeout, headers=_DEFAULT_HEADERS)
    detail_response.raise_for_status()

    details_by_email = _parse_detail_rows(detail_response.text)
    list_rows = _parse_list_rows(list_response.text)
    if not list_rows:
        raise RuntimeError("No constituencies found — the source page layout may have changed.")

    constituencies: list[Constituency] = []
    for ac_number, name, member_name, party, email in list_rows:
        detail = details_by_email.get(email or "") if email else None
        reserved = _parse_reserved_category(name) or (
            _parse_reserved_category(detail.member_display_name) if detail and detail.member_display_name else None
        )
        clean_name = _strip_reserved_suffix(name)
        constituencies.append(
            Constituency(
                ac_number=ac_number,
                name=clean_name,
                district=AC_TO_DISTRICT.get(ac_number),
                member_name=member_name,
                party=party,
                email=email,
                member_display_name=detail.member_display_name if detail else None,
                address=detail.address if detail else None,
                phone=detail.phone if detail else None,
                photo_url=detail.photo_url if detail else None,
                is_minister=detail.is_minister if detail else False,
                reserved_category=reserved,
                profile_url=DETAIL_URL,
                display_order=ac_number,
            )
        )

    constituencies.sort(key=lambda row: row.ac_number)
    return constituencies


def write_manifest(constituencies: list[Constituency], *, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "tn_constituencies.json"
    payload = {
        "source_urls": [LIST_URL, DETAIL_URL],
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(constituencies),
        "constituencies": [asdict(constituency) for constituency in constituencies],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch TN assembly constituencies manifest.")
    parser.add_argument(
        "--output-dir",
        default=str(_MANIFESTS_DIR),
        help="Folder for tn_constituencies.json (default: manifests/).",
    )
    args = parser.parse_args()

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session
    from sync_state import JOB_CONSTITUENCIES, record_sync

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    print(f"Fetching constituencies from {LIST_URL} and {DETAIL_URL} ...")
    try:
        constituencies = fetch_constituencies(session, timeout=DEFAULT_CONNECT_READ_TIMEOUT)
    except requests.RequestException as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(exc, file=sys.stderr)
        return 1

    manifest_path = write_manifest(constituencies, output_dir=Path(args.output_dir))
    matched = sum(1 for row in constituencies if row.photo_url)
    print(f"Parsed {len(constituencies)} constituencies ({matched} with photos).")
    print(f"Wrote manifest: {manifest_path}")
    record_sync(JOB_CONSTITUENCIES)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
