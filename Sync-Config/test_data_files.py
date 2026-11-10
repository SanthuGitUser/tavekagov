"""Checks on the committed JSON data, so a broken scraper output fails CI before deploy."""

import json
import re
from pathlib import Path

import pytest

from json_validate import validate_manifest_base

REPO_ROOT = Path(__file__).resolve().parent.parent
ISO_DAILY_NAME = re.compile(r"^\d{4}-\d{2}-\d{2}\.json$")

# Folders whose JSON files all carry the base manifest fields (fetchedAt, count).
BASE_MANIFEST_DIRS = [
    "TN-DVAC-Press-Release/Response-JSON",
    "TN-GOV-Press-Release/Response-JSON",
    "TN-Government-Orders/Response-JSON",
    "TN-IAS_Transfers-Postings/Response-JSON",
    "TN-TVA-Magazine",
    "TN-Finance-Notifications/manifests",
    "TN-GOV_Council-Of-Ministers/manifests",
    "TN-GOV_Departments/manifests",
    "TN-GOV_Districts/manifests",
    "TN-Govt-Schemes/manifests",
]

# Daily feeds: every file must be named YYYY-MM-DD.json.
DAILY_DIRS = [
    "TN-DIPR-Press-Release/Response-JSON",
    "TN-DVAC-Press-Release/Response-JSON",
    "TN-GOV-Press-Release/Response-JSON",
    "TN-IAS_Transfers-Postings/Response-JSON",
    "TN-News/Response-JSON",
]


def _data_json_files() -> list[Path]:
    return sorted(
        p
        for p in REPO_ROOT.glob("TN-*/**/*.json")
        if "node_modules" not in p.parts and ".venv" not in p.parts
    )


def _rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


@pytest.mark.parametrize("path", _data_json_files(), ids=_rel)
def test_json_parses(path: Path) -> None:
    json.loads(path.read_text(encoding="utf-8"))


@pytest.mark.parametrize(
    "path",
    [p for d in BASE_MANIFEST_DIRS for p in sorted((REPO_ROOT / d).rglob("*.json"))],
    ids=_rel,
)
def test_base_manifest_fields(path: Path) -> None:
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(payload, dict)
    assert validate_manifest_base(payload) == []


@pytest.mark.parametrize("folder", DAILY_DIRS)
def test_daily_file_names(folder: str) -> None:
    directory = REPO_ROOT / folder
    if not directory.is_dir():
        pytest.skip(f"{folder} not present")
    bad = [p.name for p in directory.glob("*.json") if not ISO_DAILY_NAME.match(p.name)]
    assert bad == []


def test_sync_state_job_keys_are_values_not_constant_names() -> None:
    state = json.loads((REPO_ROOT / "Sync-Config" / "last-sync.json").read_text(encoding="utf-8"))
    assert not [key for key in state.get("jobs", {}) if key.startswith("JOB_")]
