import pytest

from json_validate import validate_manifest_base


def test_validate_manifest_base_ok() -> None:
    assert validate_manifest_base({"fetchedAt": "2026-01-01T00:00:00+05:30", "count": 3}) == []


def test_validate_manifest_base_missing_fields() -> None:
    errors = validate_manifest_base({"count": -1})
    assert any("fetchedAt" in item for item in errors)
    assert any("count" in item for item in errors)
