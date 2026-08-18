"""Helpers for writing JSON files without unnecessary churn."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _strip_volatile_fields(payload: dict[str, Any], volatile_keys: set[str]) -> dict[str, Any]:
    """Return a deep-copied payload with volatile top-level keys removed."""
    # We only need to strip top-level metadata keys in this repo.
    return {k: v for k, v in payload.items() if k not in volatile_keys}


def write_json_if_changed(
    path: Path,
    payload: dict[str, Any],
    *,
    volatile_top_level_keys: set[str] | None = None,
) -> bool:
    """Write JSON only if content changed (ignoring optional volatile keys).

    Returns True if the file was written, False if it was left untouched.
    """
    volatile = volatile_top_level_keys or set()
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            existing = None

        if isinstance(existing, dict):
            if _strip_volatile_fields(existing, volatile) == _strip_volatile_fields(payload, volatile):
                return False

    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return True

