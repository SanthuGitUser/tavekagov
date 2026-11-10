from datetime import date
from pathlib import Path

from data_retention import apply_moves, cutoff_date, plan_moves


def test_cutoff_date_crosses_year_boundary() -> None:
    assert cutoff_date(date(2026, 11, 10), 12) == date(2025, 11, 1)
    assert cutoff_date(date(2026, 1, 31), 1) == date(2025, 12, 1)
    assert cutoff_date(date(2026, 3, 5), 14) == date(2025, 1, 1)


def _make(root: Path, rel: str, text: str = "{}") -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def test_moves_only_old_daily_files(tmp_path: Path) -> None:
    old = _make(tmp_path, "TN-News/Response-JSON/2025-10-31.json")
    _make(tmp_path, "TN-News/Response-JSON/2025-11-01.json")
    _make(tmp_path, "TN-News/Response-JSON/notes.json")
    _make(tmp_path, "TN-Government-Orders/Response-JSON/agriculture.json")

    moves = plan_moves(tmp_path, date(2025, 11, 1))
    assert [m.source for m in moves] == [old]

    apply_moves(moves)
    assert (tmp_path / "TN-News/archive/2025/2025-10-31.json").exists()
    assert not old.exists()
    assert (tmp_path / "TN-News/Response-JSON/2025-11-01.json").exists()
    assert (tmp_path / "TN-News/Response-JSON/notes.json").exists()


def test_refetched_day_replaces_archived_copy(tmp_path: Path) -> None:
    _make(tmp_path, "TN-News/archive/2024/2024-05-01.json", '{"v": 1}')
    _make(tmp_path, "TN-News/Response-JSON/2024-05-01.json", '{"v": 2}')

    moves = plan_moves(tmp_path, date(2025, 1, 1))
    assert moves[0].replaces_existing
    apply_moves(moves)
    assert (tmp_path / "TN-News/archive/2024/2024-05-01.json").read_text(encoding="utf-8") == '{"v": 2}'
