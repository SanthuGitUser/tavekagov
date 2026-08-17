"""
Shared last-sync state for TN data fetch scripts.

Persists checkpoint dates in Sync-Config/last-sync.json so each script can resume
from the previous successful run when --start-date / --since-date are omitted.

Usage (from sync scripts):
  from sync_state import resolve_date_range, record_date_range_sync, JOB_DIPR_PRESS_RELEASES

CLI:
  python sync_state.py --plan
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

_KOLKATA = ZoneInfo("Asia/Kolkata")
_STATE_VERSION = 1
_STATE_PATH = Path(__file__).resolve().parent / "last-sync.json"
_ISO_JSON_RE = re.compile(r"(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})\.json$")

JOB_DIPR_PRESS_RELEASES = "dipr_press_releases"
JOB_GOV_PRESS_RELEASE_IMAGES = "gov_press_release_images"
JOB_DVAC_PRESS_RELEASES = "dvac_press_releases"
JOB_FINANCE_NOTIFICATIONS = "finance_notifications"
JOB_IAS_TRANSFERS_POSTINGS = "ias_transfers_postings"
JOB_GOVERNMENT_ORDERS = "government_orders"
JOB_TVA_MAGAZINE = "tva_magazine"
JOB_DEPARTMENTS = "departments"
JOB_MINISTERS = "ministers"
JOB_DISTRICTS = "districts"
JOB_CONSTITUENCIES = "constituencies"
JOB_NEWS = "news"
JOB_GOVT_SCHEMES = "govt_schemes"

_ALL_JOBS = (
    JOB_DIPR_PRESS_RELEASES,
    JOB_GOV_PRESS_RELEASE_IMAGES,
    JOB_DVAC_PRESS_RELEASES,
    JOB_FINANCE_NOTIFICATIONS,
    JOB_IAS_TRANSFERS_POSTINGS,
    JOB_GOVERNMENT_ORDERS,
    JOB_TVA_MAGAZINE,
    JOB_DEPARTMENTS,
    JOB_MINISTERS,
    JOB_DISTRICTS,
    JOB_CONSTITUENCIES,
    JOB_NEWS,
    JOB_GOVT_SCHEMES,
)


def kolkata_today() -> date:
    return datetime.now(_KOLKATA).date()


def kolkata_now() -> datetime:
    return datetime.now(_KOLKATA)


def parse_display_date(value: str) -> date:
    normalized = value.strip().replace(".", "-").replace("/", "-")
    return datetime.strptime(normalized, "%d-%m-%Y").date()


def format_display_date(value: date) -> str:
    return value.strftime("%d-%m-%Y")


def _parse_iso_date(value: str) -> date | None:
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


def find_latest_iso_json_date(output_dir: Path) -> date | None:
    if not output_dir.is_dir():
        return None

    latest: date | None = None
    for path in output_dir.glob("*.json"):
        match = _ISO_JSON_RE.match(path.name)
        if not match:
            continue
        day = date(
            int(match.group("y")),
            int(match.group("m")),
            int(match.group("d")),
        )
        if latest is None or day > latest:
            latest = day
    return latest


def find_latest_go_date(output_dir: Path) -> date | None:
    """Scan department G.O. JSON files for the newest order date."""
    if not output_dir.is_dir():
        return None

    latest: date | None = None
    for path in output_dir.glob("*.json"):
        if _ISO_JSON_RE.match(path.name):
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        orders = payload.get("orders")
        if not isinstance(orders, list):
            continue
        for order in orders:
            if not isinstance(order, dict):
                continue
            raw = str(order.get("go_date") or "").strip()
            if not raw:
                continue
            day = _parse_iso_date(raw[:10])
            if day and (latest is None or day > latest):
                latest = day
    return latest


def find_latest_magazine_issue_date(manifest_path: Path) -> date | None:
    if not manifest_path.is_file():
        return None
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None

    magazines = payload.get("magazines")
    if not isinstance(magazines, list):
        return None

    latest: date | None = None
    for item in magazines:
        if not isinstance(item, dict):
            continue
        raw = str(item.get("issue_date") or "").strip()
        day = _parse_iso_date(raw[:10]) if raw else None
        if day and (latest is None or day > latest):
            latest = day
    return latest


def load_sync_state() -> dict[str, Any]:
    if not _STATE_PATH.is_file():
        return {"version": _STATE_VERSION, "jobs": {}}
    payload = json.loads(_STATE_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return {"version": _STATE_VERSION, "jobs": {}}
    jobs = payload.get("jobs")
    if not isinstance(jobs, dict):
        payload["jobs"] = {}
    payload.setdefault("version", _STATE_VERSION)
    return payload


def save_sync_state(state: dict[str, Any]) -> Path:
    state["version"] = _STATE_VERSION
    _STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _STATE_PATH.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return _STATE_PATH


def get_job_state(job_key: str) -> dict[str, Any]:
    jobs = load_sync_state().get("jobs") or {}
    entry = jobs.get(job_key)
    return entry if isinstance(entry, dict) else {}


def get_synced_through(job_key: str) -> date | None:
    raw = get_job_state(job_key).get("synced_through")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return _parse_iso_date(raw)


def _checkpoint_date(job_key: str, output_dir: Path | None) -> date | None:
    candidates: list[date] = []

    synced_through = get_synced_through(job_key)
    if synced_through:
        candidates.append(synced_through)

    if output_dir is not None:
        latest_json = find_latest_iso_json_date(output_dir)
        if latest_json:
            candidates.append(latest_json)

    if job_key == JOB_GOVERNMENT_ORDERS and output_dir is not None:
        latest_go = find_latest_go_date(output_dir)
        if latest_go:
            candidates.append(latest_go)

    return max(candidates) if candidates else None


def resolve_date_range(
    job_key: str,
    *,
    output_dir: Path | None,
    default_start_display: str,
    explicit_start: str | None = None,
    explicit_end: str | None = None,
    lookback_days: int = 0,
) -> tuple[date, date]:
    end = parse_display_date(explicit_end) if explicit_end else kolkata_today()

    if explicit_start:
        start = parse_display_date(explicit_start)
        return start, end

    default_start = parse_display_date(default_start_display)
    checkpoint = _checkpoint_date(job_key, output_dir)
    start = checkpoint + timedelta(days=1) if checkpoint else default_start

    if lookback_days > 0:
        lookback_start = end - timedelta(days=lookback_days - 1)
        start = min(start, lookback_start)

    start = max(start, default_start)
    return start, end


def resolve_since_date(
    job_key: str,
    *,
    output_dir: Path | None,
    manifest_path: Path | None,
    default_start_display: str,
    explicit_since: str | None = None,
) -> date:
    if explicit_since:
        return parse_display_date(explicit_since)

    default_start = parse_display_date(default_start_display)
    candidates: list[date] = []

    synced_through = get_synced_through(job_key)
    if synced_through:
        candidates.append(synced_through)

    if output_dir is not None:
        latest_json = find_latest_iso_json_date(output_dir)
        if latest_json:
            candidates.append(latest_json)

    if manifest_path is not None:
        latest_issue = find_latest_magazine_issue_date(manifest_path)
        if latest_issue:
            candidates.append(latest_issue)

    if candidates:
        return max(candidates) + timedelta(days=1)
    return default_start


def record_date_range_sync(
    job_key: str,
    *,
    synced_through: date,
    extra: dict[str, Any] | None = None,
) -> Path:
    state = load_sync_state()
    jobs = state.setdefault("jobs", {})
    entry: dict[str, Any] = {
        "last_sync_at": kolkata_now().isoformat(timespec="seconds"),
        "synced_through": synced_through.isoformat(),
    }
    if extra:
        entry.update(extra)
    jobs[job_key] = entry
    return save_sync_state(state)


def record_sync(job_key: str, *, extra: dict[str, Any] | None = None) -> Path:
    state = load_sync_state()
    jobs = state.setdefault("jobs", {})
    entry: dict[str, Any] = {
        "last_sync_at": kolkata_now().isoformat(timespec="seconds"),
    }
    if extra:
        entry.update(extra)
    jobs[job_key] = entry
    return save_sync_state(state)


def _plan_date_range_job(
    job_key: str,
    label: str,
    output_dir: Path,
    default_start: str,
) -> str:
    start, end = resolve_date_range(
        job_key,
        output_dir=output_dir,
        default_start_display=default_start,
    )
    if start > end:
        return f"  {label}: up to date (through {format_display_date(end)})"
    return f"  {label}: {format_display_date(start)} -> {format_display_date(end)}"


def print_sync_plan(repo_root: Path) -> None:
    default_start = "10-05-2026"
    print("Planned sync ranges (from last-sync.json + output files):")
    print(
        _plan_date_range_job(
            JOB_DIPR_PRESS_RELEASES,
            "DIPR",
            repo_root / "TN-DIPR-Press Release/Response JSON",
            default_start,
        )
    )
    print(
        _plan_date_range_job(
            JOB_GOV_PRESS_RELEASE_IMAGES,
            "PR images",
            repo_root / "TN-GOV-Press Release/Response JSON",
            default_start,
        )
    )
    print(
        _plan_date_range_job(
            JOB_DVAC_PRESS_RELEASES,
            "DVAC",
            repo_root / "TN-DVAC-Press Release/Response JSON",
            "01-05-2026",
        )
    )
    last_finance = get_job_state(JOB_FINANCE_NOTIFICATIONS).get("last_sync_at") or "never"
    print(f"  Finance notifications: full refresh (last sync {last_finance})")
    print(
        _plan_date_range_job(
            JOB_IAS_TRANSFERS_POSTINGS,
            "Transfers",
            repo_root / "TN-IAS_Transfers-Postings/Response JSON",
            default_start,
        )
    )
    start, end = resolve_date_range(
        JOB_GOVERNMENT_ORDERS,
        output_dir=repo_root / "TN-Government Orders/Response JSON",
        default_start_display=default_start,
    )
    if start > end:
        print(f"  Government orders: up to date (through {format_display_date(end)})")
    else:
        print(f"  Government orders: {format_display_date(start)} -> {format_display_date(end)} (merge)")

    since = resolve_since_date(
        JOB_TVA_MAGAZINE,
        output_dir=repo_root / "TN-TVA-Magazine/Response JSON",
        manifest_path=repo_root / "TN-TVA-Magazine/manifests/magazine.json",
        default_start_display=default_start,
    )
    print(f"  Magazine: since {format_display_date(since)}")

    for job_key, label in (
        (JOB_DEPARTMENTS, "Departments"),
        (JOB_MINISTERS, "Ministers"),
        (JOB_DISTRICTS, "Districts"),
        (JOB_CONSTITUENCIES, "Constituencies"),
        (JOB_NEWS, "News"),
        (JOB_GOVT_SCHEMES, "Govt schemes"),
    ):
        last = get_job_state(job_key).get("last_sync_at") or "never"
        print(f"  {label}: full refresh (last sync {last})")


def main() -> int:
    parser = argparse.ArgumentParser(description="Read or update shared sync checkpoints.")
    parser.add_argument(
        "--plan",
        action="store_true",
        help="Print planned date ranges for sync-all.ps1.",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help="Repository root (default: parent of Sync-Config/).",
    )
    args = parser.parse_args()

    if args.plan:
        print_sync_plan(args.repo_root.resolve())
        return 0

    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
