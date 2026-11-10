import json
from pathlib import Path

from write_utils import write_json_if_changed


def test_writes_new_file(tmp_path: Path) -> None:
    target = tmp_path / "nested" / "out.json"
    assert write_json_if_changed(target, {"count": 1}) is True
    assert json.loads(target.read_text(encoding="utf-8")) == {"count": 1}


def test_skips_identical_payload(tmp_path: Path) -> None:
    target = tmp_path / "out.json"
    write_json_if_changed(target, {"count": 1})
    assert write_json_if_changed(target, {"count": 1}) is False


def test_ignores_volatile_keys(tmp_path: Path) -> None:
    target = tmp_path / "out.json"
    write_json_if_changed(target, {"count": 1, "fetchedAt": "a"})
    changed = write_json_if_changed(
        target, {"count": 1, "fetchedAt": "b"}, volatile_top_level_keys={"fetchedAt"}
    )
    assert changed is False
    assert json.loads(target.read_text(encoding="utf-8"))["fetchedAt"] == "a"


def test_rewrites_when_content_changes(tmp_path: Path) -> None:
    target = tmp_path / "out.json"
    write_json_if_changed(target, {"count": 1})
    assert write_json_if_changed(target, {"count": 2}) is True


def test_keeps_tamil_text_readable(tmp_path: Path) -> None:
    target = tmp_path / "out.json"
    write_json_if_changed(target, {"title": "தமிழ்"})
    assert "தமிழ்" in target.read_text(encoding="utf-8")
