"""
Fetch Finance Department homepage notifications and download linked PDFs.

Writes a rolling manifest to:
  TN-Finance-Notifications/manifests/notifications.json

Downloads PDFs to:
  TN-Finance-Notifications/PDFs/
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_SYNC_CONFIG = _REPO_ROOT / "Sync-Config"
_OUT_DIR = Path(__file__).resolve().parent
_PDF_DIR = _OUT_DIR / "PDFs"
_MANIFEST_PATH = _OUT_DIR / "manifests" / "notifications.json"
_KOLKATA = ZoneInfo("Asia/Kolkata")

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}

_NOTIF_BLOCK_RE = re.compile(
    r'id="elementor-tab-content-2351".*?<div id="elementor-tab-content-2352"',
    re.IGNORECASE | re.DOTALL,
)
_LINK_RE = re.compile(
    r'<a[^>]+href="(?P<href>[^"]+)"[^>]*>(?P<title>.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class FinanceNotification:
    title: str
    pdf_url: str
    file_name: str
    local_path: str | None


def _load_config() -> str:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from config import get_tn_finance_notifications_source_url

    return get_tn_finance_notifications_source_url()


def _strip_html(value: str) -> str:
    cleaned = _TAG_RE.sub(" ", value)
    cleaned = _WS_RE.sub(" ", cleaned).strip()
    return cleaned


def _remove_fragment(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))


def _file_name_from_url(url: str) -> str:
    path = urlsplit(url).path
    name = path.rsplit("/", maxsplit=1)[-1] if path else "notification.pdf"
    return name or "notification.pdf"


def parse_notifications(html: str) -> list[FinanceNotification]:
    match = _NOTIF_BLOCK_RE.search(html)
    block = match.group(0) if match else html
    items: list[FinanceNotification] = []
    seen: set[str] = set()

    for link in _LINK_RE.finditer(block):
        href = link.group("href").strip()
        if not href:
            continue
        href = _remove_fragment(href)
        title = _strip_html(link.group("title") or "")
        if not title:
            continue
        if not href.lower().endswith(".pdf"):
            continue
        if href in seen:
            continue
        seen.add(href)
        items.append(
            FinanceNotification(
                title=title,
                pdf_url=href,
                file_name=_file_name_from_url(href),
                local_path=None,
            )
        )

    return items


def _safe_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _load_existing_manifest(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _download_pdf(session: requests.Session, url: str, out_path: Path) -> None:
    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with session.get(url, stream=True, timeout=DEFAULT_CONNECT_READ_TIMEOUT) as resp:
        resp.raise_for_status()
        with out_path.open("wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 128):
                if chunk:
                    f.write(chunk)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync Finance Department notifications PDFs.")
    parser.add_argument(
        "--output-dir",
        default=str(_OUT_DIR),
        help="Module output dir (default: TN-Finance-Notifications/).",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=50,
        help="Max notification items to keep/download (default 50).",
    )
    args = parser.parse_args()

    source_url = _load_config()

    out_dir = Path(args.output_dir)
    pdf_dir = out_dir / "PDFs"
    manifest_path = out_dir / "manifests" / "notifications.json"

    if str(_SYNC_CONFIG) not in sys.path:
        sys.path.insert(0, str(_SYNC_CONFIG))
    from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session
    from sync_state import JOB_FINANCE_NOTIFICATIONS, record_sync

    session = build_retry_session(headers=_DEFAULT_HEADERS)
    print(f"Source page: {source_url}")

    resp = session.get(source_url, timeout=DEFAULT_CONNECT_READ_TIMEOUT, headers={"Referer": source_url})
    resp.raise_for_status()
    notifications = parse_notifications(resp.text)
    notifications = notifications[: max(1, args.max_items)]

    existing = _load_existing_manifest(manifest_path) or {}
    existing_items = existing.get("items")
    existing_by_url: dict[str, dict[str, Any]] = {}
    if isinstance(existing_items, list):
        for item in existing_items:
            if not isinstance(item, dict):
                continue
            url = str(item.get("pdf_url") or "").strip()
            if url:
                existing_by_url[url] = item

    downloaded = 0
    for index, note in enumerate(notifications, start=1):
        out_path = pdf_dir / note.file_name
        if not out_path.exists():
            print(f"  [{index}/{len(notifications)}] Downloading: {note.file_name}")
            _download_pdf(session, note.pdf_url, out_path)
            downloaded += 1
            time.sleep(0.2)

        local_path = str(out_path.relative_to(out_dir)).replace("\\", "/")
        existing_record = existing_by_url.get(note.pdf_url) or {}
        notifications[index - 1] = FinanceNotification(
            title=note.title,
            pdf_url=note.pdf_url,
            file_name=note.file_name,
            local_path=existing_record.get("local_path") or local_path,
        )

    fetched_at = datetime.now(_KOLKATA).isoformat(timespec="seconds")
    payload = {
        "source_url": source_url,
        "fetchedAt": fetched_at,
        "count": len(notifications),
        "downloadedThisRun": downloaded,
        "items": [asdict(item) for item in notifications],
    }
    _safe_write_json(manifest_path, payload)
    record_sync(JOB_FINANCE_NOTIFICATIONS, extra={"count": len(notifications)})
    print(f"Saved manifest: {manifest_path}")
    print(f"Downloaded {downloaded} PDF(s) this run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

