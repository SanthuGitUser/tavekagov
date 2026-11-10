"""
Derive small "final round only" election manifests from the full round-wise imports.

The dashboard only needs each constituency's final tally, but the round-wise files
hold every counting round (~23 MB). This writes a copy that keeps only the last
round per constituency, so the dashboard can load a few hundred KB instead.

Re-run after any import_*roundwise_once.py import:
  python TN-Election-Results/build_final_round_results.py
  python TN-Election-Results/build_final_round_results.py --check   # CI: fail if out of date
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

MANIFEST_DIR = Path(__file__).resolve().parent / "manifests"

# (full round-wise source, derived final-round output)
PAIRS = [
    ("tn_assembly_2026_roundwise.json", "tn_assembly_2026_final_round.json"),
    ("tn_assembly_2026_bye_roundwise.json", "tn_assembly_2026_bye_final_round.json"),
]


def final_round_only(manifest: dict[str, Any]) -> dict[str, Any]:
    out = {key: value for key, value in manifest.items() if key != "results"}
    out["derived_from"] = "round-wise manifest; only the final counting round is kept"
    results = []
    for result in manifest.get("results", []):
        rounds = result.get("rounds") or []
        last = max(rounds, key=lambda item: item.get("round", 0)) if rounds else None
        results.append({**result, "rounds": [last] if last else []})
    out["results"] = results
    return out


def render(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    parser.add_argument("--check", action="store_true", help="Exit 1 if outputs are out of date")
    args = parser.parse_args()

    stale: list[str] = []
    for source_name, output_name in PAIRS:
        source = MANIFEST_DIR / source_name
        output = MANIFEST_DIR / output_name
        if not source.exists():
            print(f"Skipping missing source: {source_name}")
            continue
        text = render(final_round_only(json.loads(source.read_text(encoding="utf-8"))))
        current = output.read_text(encoding="utf-8") if output.exists() else None
        if current == text:
            print(f"Up to date: {output_name}")
            continue
        if args.check:
            stale.append(output_name)
            continue
        output.write_text(text, encoding="utf-8")
        print(f"Wrote {output_name} ({len(text.encode('utf-8')) // 1024} KB)")

    if stale:
        print("Out of date (run build_final_round_results.py): " + ", ".join(stale), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
