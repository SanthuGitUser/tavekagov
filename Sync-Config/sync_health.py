"""
Refresh sync job health metadata in Sync-Config/last-sync.json from on-disk JSON outputs.

Run after sync-all.ps1 or on a schedule to surface item counts and stale-feed warnings.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from sync_state import (
    JOB_CONSTITUENCIES,
    JOB_DEPARTMENTS,
    JOB_DIPR_PRESS_RELEASES,
    JOB_DISTRICTS,
    JOB_DVAC_PRESS_RELEASES,
    JOB_FINANCE_NOTIFICATIONS,
    JOB_GOVERNMENT_ORDERS,
    JOB_GOV_PRESS_RELEASE_IMAGES,
    JOB_GOVT_SCHEMES,
    JOB_IAS_TRANSFERS_POSTINGS,
    JOB_MINISTERS,
    JOB_NEWS,
    JOB_TVA_MAGAZINE,
    find_latest_iso_json_date,
    kolkata_now,
    kolkata_today,
    load_sync_state,
    save_sync_state,
)

_REPO_ROOT = Path(__file__).resolve().parent.parent
_ISO_JSON_RE = __import__("re").compile(r"(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})\.json$")


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return None
    return payload if isinstance(payload, dict) else None


def _count_daily_items(output_dir: Path, list_keys: tuple[str, ...]) -> int:
    if not output_dir.is_dir():
        return 0
    total = 0
    for path in output_dir.glob("*.json"):
        if not _ISO_JSON_RE.match(path.name):
            continue
        payload = _read_json(path)
        if not payload:
            continue
        for key in list_keys:
            value = payload.get(key)
            if isinstance(value, list):
                total += len(value)
                break
            nested = payload.get("response")
            if isinstance(nested, dict):
                data = nested.get("data")
                if isinstance(data, list):
                    total += len(data)
                    break
    return total


def _count_news_articles(output_dir: Path) -> int:
    if not output_dir.is_dir():
        return 0
    total = 0
    for path in output_dir.glob("*.json"):
        if not _ISO_JSON_RE.match(path.name):
            continue
        payload = _read_json(path)
        if not payload:
            continue
        nested = payload.get("response")
        if isinstance(nested, dict):
            results = nested.get("results")
            if isinstance(results, list):
                total += len(results)
                continue
        results = payload.get("results")
        if isinstance(results, list):
            total += len(results)
    return total


def _count_manifest_items(manifest_path: Path, list_key: str) -> int:
    payload = _read_json(manifest_path)
    if not payload:
        return 0
    items = payload.get(list_key)
    if isinstance(items, list):
        return len(items)
    count = payload.get("count")
    return int(count) if isinstance(count, int) else 0


def _count_go_orders(output_dir: Path) -> int:
    if not output_dir.is_dir():
        return 0
    total = 0
    for path in output_dir.glob("*.json"):
        if _ISO_JSON_RE.match(path.name):
            continue
        payload = _read_json(path)
        if not payload:
            continue
        orders = payload.get("orders")
        if isinstance(orders, list):
            total += len(orders)
    return total


def _health_status(*, item_count: int, synced_through: date | None, stale_days: int) -> str:
    if item_count <= 0:
        return "empty"
    if synced_through is None:
        return "ok"
    if synced_through < kolkata_today() - timedelta(days=stale_days):
        return "stale"
    return "ok"


def _merge_job_health(
    jobs: dict[str, Any],
    job_key: str,
    *,
    item_count: int,
    synced_through: date | None = None,
    warnings: list[str] | None = None,
    stale_days: int = 2,
) -> None:
    entry = jobs.get(job_key)
    if not isinstance(entry, dict):
        entry = {}
    entry["last_item_count"] = item_count
    entry["health_status"] = _health_status(
        item_count=item_count,
        synced_through=synced_through,
        stale_days=stale_days,
    )
    if warnings:
        entry["warnings"] = warnings
    elif "warnings" in entry and not warnings:
        entry.pop("warnings", None)
    jobs[job_key] = entry


def refresh_sync_health(*, stale_days: int = 2) -> Path:
    state = load_sync_state()
    jobs = state.setdefault("jobs", {})
    if not isinstance(jobs, dict):
        jobs = {}
        state["jobs"] = jobs

    dipr_dir = _REPO_ROOT / "TN-DIPR-Press Release" / "Response JSON"
    dipr_through = find_latest_iso_json_date(dipr_dir)
    dipr_count = _count_daily_items(dipr_dir, ("data",))
    _merge_job_health(
        jobs,
        JOB_DIPR_PRESS_RELEASES,
        item_count=dipr_count,
        synced_through=dipr_through,
        warnings=["zero items in daily JSON"] if dipr_count == 0 else None,
        stale_days=stale_days,
    )

    gov_pr_dir = _REPO_ROOT / "TN-GOV-Press Release" / "Response JSON"
    _merge_job_health(
        jobs,
        JOB_GOV_PRESS_RELEASE_IMAGES,
        item_count=_count_daily_items(gov_pr_dir, ("releases",)),
        synced_through=find_latest_iso_json_date(gov_pr_dir),
        stale_days=stale_days,
    )

    dvac_dir = _REPO_ROOT / "TN-DVAC-Press Release" / "Response JSON"
    _merge_job_health(
        jobs,
        JOB_DVAC_PRESS_RELEASES,
        item_count=_count_daily_items(dvac_dir, ("releases",)),
        synced_through=find_latest_iso_json_date(dvac_dir),
        stale_days=stale_days,
    )

    finance_manifest = _REPO_ROOT / "TN-Finance-Notifications" / "manifests" / "notifications.json"
    _merge_job_health(
        jobs,
        JOB_FINANCE_NOTIFICATIONS,
        item_count=_count_manifest_items(finance_manifest, "items"),
    )

    go_dir = _REPO_ROOT / "TN-Government Orders" / "Response JSON"
    _merge_job_health(
        jobs,
        JOB_GOVERNMENT_ORDERS,
        item_count=_count_go_orders(go_dir),
    )

    ias_dir = _REPO_ROOT / "TN-IAS_Transfers-Postings" / "Response JSON"
    _merge_job_health(
        jobs,
        JOB_IAS_TRANSFERS_POSTINGS,
        item_count=_count_daily_items(ias_dir, ("postings",)),
        synced_through=find_latest_iso_json_date(ias_dir),
        stale_days=stale_days,
    )

    magazine_manifest = _REPO_ROOT / "TN-TVA-Magazine" / "manifests" / "magazine.json"
    _merge_job_health(
        jobs,
        JOB_TVA_MAGAZINE,
        item_count=_count_manifest_items(magazine_manifest, "magazines"),
    )

    _merge_job_health(
        jobs,
        JOB_DEPARTMENTS,
        item_count=_count_manifest_items(
            _REPO_ROOT / "TN-GOV_Departments" / "manifests" / "tn_departments.json",
            "departments",
        ),
    )
    _merge_job_health(
        jobs,
        JOB_MINISTERS,
        item_count=_count_manifest_items(
            _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json",
            "ministers",
        ),
    )
    _merge_job_health(
        jobs,
        JOB_DISTRICTS,
        item_count=_count_manifest_items(
            _REPO_ROOT / "TN-GOV_Districts" / "manifests" / "tn_districts.json",
            "districts",
        ),
    )
    _merge_job_health(
        jobs,
        JOB_CONSTITUENCIES,
        item_count=_count_manifest_items(
            _REPO_ROOT / "TN-Constituencies" / "manifests" / "tn_constituencies.json",
            "constituencies",
        ),
    )
    _merge_job_health(
        jobs,
        JOB_GOVT_SCHEMES,
        item_count=_count_manifest_items(
            _REPO_ROOT / "TN-Govt-Schemes" / "manifests" / "tn_govt_schemes.json",
            "schemes",
        ),
    )

    news_dir = _REPO_ROOT / "TN-News" / "Response JSON"
    news_count = _count_news_articles(news_dir)
    _merge_job_health(
        jobs,
        JOB_NEWS,
        item_count=news_count,
        synced_through=find_latest_iso_json_date(news_dir),
        stale_days=stale_days,
    )

    state["health_refreshed_at"] = kolkata_today().isoformat()
    version_path = _REPO_ROOT / "Sync-Config" / "data-version.json"
    version_path.write_text(
        json.dumps(
            {
                "version": kolkata_now().isoformat(timespec="seconds"),
                "health_refreshed_at": state["health_refreshed_at"],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return save_sync_state(state)


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh sync health metadata in last-sync.json")
    parser.add_argument(
        "--stale-days",
        type=int,
        default=2,
        help="Mark date-range jobs stale if synced_through is older than this many days",
    )
    args = parser.parse_args()
    path = refresh_sync_health(stale_days=max(0, args.stale_days))
    print(f"Updated sync health in {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
