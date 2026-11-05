"""
Lightweight JSON manifest validation for sync outputs (no external deps).
"""

from __future__ import annotations

from typing import Any


def validate_manifest_base(payload: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if not isinstance(payload.get("fetchedAt"), str) or not str(payload["fetchedAt"]).strip():
        errors.append("missing or empty fetchedAt")
    count = payload.get("count")
    if not isinstance(count, int) or count < 0:
        errors.append("count must be a non-negative integer")
    return errors
