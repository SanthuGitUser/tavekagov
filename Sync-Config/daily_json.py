"""Shared helpers for writing per-day JSON response files."""

from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Callable


def load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def merge_items_by_key(
    existing: list[dict[str, Any]],
    incoming: list[dict[str, Any]],
    key_fn: Callable[[dict[str, Any]], str],
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for item in existing:
        key = key_fn(item)
        if key:
            merged[key] = item
    for item in incoming:
        key = key_fn(item)
        if key:
            merged[key] = item
    return list(merged.values())


def save_daily_json(
    output_dir: Path,
    *,
    day: date,
    items_key: str,
    items: list[dict[str, Any]],
    source_url: str,
    fetched_at: datetime,
    merge_key_fn: Callable[[dict[str, Any]], str],
    extra: dict[str, Any] | None = None,
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"{day.isoformat()}.json"

    existing_record = load_json(out_path)
    existing_items: list[dict[str, Any]] = []
    fetch_count = 1
    first_fetched_at = fetched_at.isoformat()

    if existing_record:
        raw_existing = existing_record.get(items_key)
        if isinstance(raw_existing, list):
            existing_items = raw_existing
        fetch_count = int(existing_record.get("fetchCount") or 0) + 1
        first_fetched_at = str(existing_record.get("fetchedAt") or first_fetched_at)

    merged_items = merge_items_by_key(existing_items, items, merge_key_fn)

    # Avoid touching the file when there are no new items (append-only semantics).
    # This keeps fetchedAt/lastFetchedAt stable unless the dataset actually grows.
    existing_keys = {merge_key_fn(item) for item in existing_items if merge_key_fn(item)}
    incoming_keys = {merge_key_fn(item) for item in items if merge_key_fn(item)}
    has_new_items = bool(incoming_keys - existing_keys)
    if existing_record and not has_new_items:
        return out_path

    record: dict[str, Any] = {
        "date": day.isoformat(),
        "fetchedAt": first_fetched_at,
        "lastFetchedAt": fetched_at.isoformat(),
        "fetchCount": fetch_count,
        "source_url": source_url,
        "count": len(merged_items),
        items_key: merged_items,
    }
    if extra:
        record.update(extra)
    out_path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out_path


def write_items_by_day(
    output_dir: Path,
    *,
    items_key: str,
    items: list[dict[str, Any]],
    date_fn: Callable[[dict[str, Any]], date],
    source_url: str,
    fetched_at: datetime,
    merge_key_fn: Callable[[dict[str, Any]], str],
) -> list[Path]:
    by_day: dict[date, list[dict[str, Any]]] = {}
    for item in items:
        day = date_fn(item)
        by_day.setdefault(day, []).append(item)

    saved_paths: list[Path] = []
    for day in sorted(by_day):
        saved_paths.append(
            save_daily_json(
                output_dir,
                day=day,
                items_key=items_key,
                items=by_day[day],
                source_url=source_url,
                fetched_at=fetched_at,
                merge_key_fn=merge_key_fn,
            )
        )
    return saved_paths
