"""
Backfill ministers/departments reference arrays on existing daily PR image JSON files.

Usage:
  python backfill_daily_references.py
"""

from __future__ import annotations

import json
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_OUTPUT_DIR = Path(__file__).resolve().parent / "Response JSON"


def main() -> int:
    ministers_path = _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json"
    departments_path = _REPO_ROOT / "TN-GOV_Departments" / "manifests" / "tn_departments.json"
    ministers = {
        item["id"]: item for item in json.loads(ministers_path.read_text(encoding="utf-8"))["ministers"]
    }
    departments = {
        item["id"]: item
        for item in json.loads(departments_path.read_text(encoding="utf-8"))["departments"]
    }

    updated = 0
    for path in sorted(_OUTPUT_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        releases = payload.get("releases")
        if not isinstance(releases, list):
            continue

        minister_ids = {
            int(release["minister_id"])
            for release in releases
            if isinstance(release, dict) and release.get("minister_id") is not None
        }
        department_ids = {
            int(release["department_id"])
            for release in releases
            if isinstance(release, dict) and release.get("department_id") is not None
        }

        payload["ministers"] = [ministers[minister_id] for minister_id in sorted(minister_ids) if minister_id in ministers]
        payload["departments"] = [
            departments[department_id]
            for department_id in sorted(department_ids)
            if department_id in departments
        ]
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        updated += 1

    print(f"Updated {updated} daily JSON file(s) in {_OUTPUT_DIR}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
