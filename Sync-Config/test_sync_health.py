from datetime import date, timedelta

import sync_health
from sync_health import _checkpoint_date, _health_status, unhealthy_jobs
from sync_state import kolkata_today


def test_health_status_empty_when_no_items() -> None:
    assert _health_status(item_count=0, synced_through=kolkata_today(), stale_days=2) == "empty"


def test_health_status_ok_without_date() -> None:
    assert _health_status(item_count=5, synced_through=None, stale_days=2) == "ok"


def test_health_status_stale_after_threshold() -> None:
    old = kolkata_today() - timedelta(days=3)
    assert _health_status(item_count=5, synced_through=old, stale_days=2) == "stale"
    assert _health_status(item_count=5, synced_through=old, stale_days=14) == "ok"


def test_checkpoint_date_prefers_newer_checkpoint() -> None:
    jobs = {"ias": {"synced_through": "2026-11-05"}}
    assert _checkpoint_date(jobs, "ias", date(2026, 6, 16)) == date(2026, 11, 5)


def test_checkpoint_date_prefers_newer_file() -> None:
    jobs = {"ias": {"synced_through": "2026-01-01"}}
    assert _checkpoint_date(jobs, "ias", date(2026, 6, 16)) == date(2026, 6, 16)


def test_checkpoint_date_ignores_bad_values() -> None:
    assert _checkpoint_date({"ias": {"synced_through": "nope"}}, "ias", None) is None
    assert _checkpoint_date({}, "ias", date(2026, 1, 1)) == date(2026, 1, 1)


def test_unhealthy_jobs_lists_stale_and_empty_only() -> None:
    jobs = {
        "a": {"health_status": "ok"},
        "b": {"health_status": "stale"},
        "c": {"health_status": "empty"},
        "d": {},
        "e": "not-a-dict",
    }
    assert unhealthy_jobs(jobs) == {"b": "stale", "c": "empty"}


def test_irregular_feed_threshold_is_longer_than_default() -> None:
    assert sync_health._IRREGULAR_FEED_STALE_DAYS > 2
