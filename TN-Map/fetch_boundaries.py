"""
Download Tamil Nadu district boundary GeoJSON into this folder.

Usage:
  python TN-Map/fetch_boundaries.py
"""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

_KOLKATA = ZoneInfo("Asia/Kolkata")
_DIR = Path(__file__).resolve().parent
_URL = (
    "https://cdn.jsdelivr.net/gh/udit-001/india-maps-data"
    "@2884453/geojson/states/tamil-nadu.geojson"
)
_OUTPUT = _DIR / "tamil-nadu-districts.geojson"
_MANIFEST = _DIR / "manifest.json"
_ALIASES = _DIR / "district-name-aliases.json"
_MAYILADUTHURAI_MAPIT = "https://global.mapit.mysociety.org/area/1225592.geojson?simplify_tolerance=0.001"
_NAGAPATTINAM_MAPIT = "https://global.mapit.mysociety.org/area/797093.geojson?simplify_tolerance=0.001"


def _fetch_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=120) as response:
        return json.loads(response.read())


def _patch_post_2020_districts(geo: dict) -> dict:
    """Add Mayiladuthurai (2020) and refresh Nagapattinam from OSM/MapIt."""
    mayil_geom = _fetch_json(_MAYILADUTHURAI_MAPIT)
    nagap_geom = _fetch_json(_NAGAPATTINAM_MAPIT)

    def feature(name: str, geometry: dict) -> dict:
        return {
            "type": "Feature",
            "properties": {
                "district": name,
                "st_code": "33",
                "st_nm": "Tamil Nadu",
                "year": "2020",
            },
            "geometry": geometry,
        }

    features = []
    for item in geo.get("features", []):
        district = item.get("properties", {}).get("district")
        if district == "Nagapattinam":
            features.append(feature("Nagapattinam", nagap_geom))
        else:
            features.append(item)

    features.append(feature("Mayiladuthurai", mayil_geom))
    features.sort(key=lambda row: row["properties"]["district"])
    return {"type": "FeatureCollection", "features": features}


def main() -> None:
    print(f"Fetching {_URL} …")
    with urllib.request.urlopen(_URL, timeout=120) as response:
        raw = response.read()

    geo = json.loads(raw)
    geo = _patch_post_2020_districts(geo)
    feature_count = len(geo.get("features", []))
    districts = sorted(
        feature.get("properties", {}).get("district", "?")
        for feature in geo.get("features", [])
    )

    _OUTPUT.write_text(json.dumps(geo, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {_OUTPUT} ({_OUTPUT.stat().st_size:,} bytes, {feature_count} features)")

    aliases = json.loads(_ALIASES.read_text(encoding="utf-8"))
    mapped = {aliases.get(name, name) for name in districts}

    manifest_path = _DIR.parent / "TN-GOV_Districts" / "manifests" / "tn_districts.json"
    manifest_names = {
        row["name"]
        for row in json.loads(manifest_path.read_text(encoding="utf-8"))["districts"]
    }
    missing_from_map = sorted(manifest_names - mapped)

    manifest = {
        "source_url": "https://github.com/udit-001/india-maps-data + OpenStreetMap/MapIt (Mayiladuthurai)",
        "source_file": "geojson/states/tamil-nadu.geojson + MapIt area/1225592",
        "source_commit": "2884453",
        "license": "See upstream repository",
        "fetchedAt": datetime.now(_KOLKATA).isoformat(timespec="seconds"),
        "feature_count": feature_count,
        "manifest_district_count": len(manifest_names),
        "missing_districts": missing_from_map,
        "geo_districts": districts,
        "notes": (
            "district-name-aliases.json maps GeoJSON property names to tn.gov.in district names."
        ),
    }
    _MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {_MANIFEST}")
    if missing_from_map:
        print("Districts in manifest but not on map:", ", ".join(missing_from_map))


if __name__ == "__main__":
    main()
