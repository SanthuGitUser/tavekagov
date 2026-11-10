"""
Archive old daily JSON so the dashboard build stays small.

Daily feeds write `<feed>/Response-JSON/YYYY-MM-DD.json`. Files older than the
retention window are moved to `<feed>/archive/YYYY/YYYY-MM-DD.json`. Archived files
stay in the repository (and in git history) but are no longer bundled into the
website, which only reads `Response-JSON/`.

Window: --keep-months, else DATA_RETENTION_MONTHS in Sync-Config/.env, else 12.
A file is kept when its date is on or after the 1st of the month N months ago.

  python Sync-Config/data_retention.py --dry-run
  python Sync-Config/data_retention.py --keep-months 18

Run automatically by scripts/sync-all.ps1 (skip with -SkipRetention).
Government Orders are stored per department, not per day, so they are not archived.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_DEFAULT_KEEP_MONTHS = 12
_DAILY_NAME = re.compile(r"^(\d{4})-(\d{2})-(\d{2})\.json$")

# Feeds that store one file per day under Response-JSON/.
DAILY_FEEDS = (
    "TN-DIPR-Press-Release",
    "TN-GOV-Press-Release",
    "TN-DVAC-Press-Release",
    "TN-IAS_Transfers-Postings",
    "TN-News",
    "TN-TVA-Magazine",
)


@dataclass(frozen=True)
class ArchiveMove:
    source: Path
    target: Path
    replaces_existing: bool


def cutoff_date(today: date, keep_months: int) -> date:
    """First day of the month `keep_months` months before `today`'s month."""
    month_index = today.year * 12 + (today.month - 1) - keep_months
    return date(month_index // 12, month_index % 12 + 1, 1)


def plan_moves(repo_root: Path, cutoff: date) -> list[ArchiveMove]:
    moves: list[ArchiveMove] = []
    for feed in DAILY_FEEDS:
        daily_dir = repo_root / feed / "Response-JSON"
        if not daily_dir.is_dir():
            continue
        for path in sorted(daily_dir.glob("*.json")):
            match = _DAILY_NAME.match(path.name)
            if not match:
                continue
            file_date = date(int(match[1]), int(match[2]), int(match[3]))
            if file_date >= cutoff:
                continue
            target = repo_root / feed / "archive" / match[1] / path.name
            moves.append(ArchiveMove(path, target, target.exists()))
    return moves


def apply_moves(moves: list[ArchiveMove]) -> None:
    for move in moves:
        move.target.parent.mkdir(parents=True, exist_ok=True)
        # A re-fetched old day replaces its archived copy: the newest fetch wins.
        shutil.move(str(move.source), str(move.target))


def _keep_months_from_env() -> int | None:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    try:
        import config  # noqa: F401  (loads Sync-Config/.env into the environment)
    except Exception:
        pass
    raw = os.getenv("DATA_RETENTION_MONTHS", "").strip()
    return int(raw) if raw.isdigit() else None


def main() -> int:
    parser = argparse.ArgumentParser(description="Archive daily JSON older than the retention window")
    parser.add_argument("--keep-months", type=int, default=None, help="Months of daily files to keep")
    parser.add_argument("--dry-run", action="store_true", help="List what would move, change nothing")
    args = parser.parse_args()

    keep_months = args.keep_months
    if keep_months is None:
        keep_months = _keep_months_from_env() or _DEFAULT_KEEP_MONTHS
    if keep_months < 1:
        parser.error("--keep-months must be at least 1")

    cutoff = cutoff_date(date.today(), keep_months)
    moves = plan_moves(_REPO_ROOT, cutoff)
    print(f"Retention: keep {keep_months} month(s) of daily files (archiving dates before {cutoff}).")
    if not moves:
        print("Nothing to archive.")
        return 0

    for move in moves:
        note = " (replaces archived copy)" if move.replaces_existing else ""
        print(f"  {move.source.relative_to(_REPO_ROOT)} -> {move.target.relative_to(_REPO_ROOT)}{note}")
    if args.dry_run:
        print(f"Dry run: {len(moves)} file(s) would be archived.")
        return 0

    apply_moves(moves)
    print(f"Archived {len(moves)} file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
