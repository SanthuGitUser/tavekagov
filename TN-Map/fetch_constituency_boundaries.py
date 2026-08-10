"""
Download Tamil Nadu assembly constituency boundaries from DataMeet and write GeoJSON.

Source: https://github.com/datameet/maps (Assembly Constituencies, CC BY 2.5 India)
Filters ST_CODE=33 (Tamil Nadu) — 234 constituencies with AC_NO 1–234.

Usage:
  pip install -r TN-Map/requirements.txt
  python TN-Map/fetch_constituency_boundaries.py
"""

from __future__ import annotations

import json
import re
import tempfile
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import shapefile

_KOLKATA = ZoneInfo("Asia/Kolkata")
_DIR = Path(__file__).resolve().parent
_DATAMEET_BASE = (
    "https://raw.githubusercontent.com/datameet/maps/master/assembly-constituencies"
)
_OUTPUT = _DIR / "tamil-nadu-constituencies.geojson"
_MANIFEST = _DIR / "constituency-boundaries-manifest.json"
_TN_ST_CODE = "33"
_SHAPEFILE_STEM = "India_AC"


def _download_shapefile(tmp_dir: Path) -> Path:
    for ext in ("shp", "shx", "dbf", "prj"):
        url = f"{_DATAMEET_BASE}/{_SHAPEFILE_STEM}.{ext}"
        target = tmp_dir / f"{_SHAPEFILE_STEM}.{ext}"
        print(f"Fetching {url} …")
        with urllib.request.urlopen(url, timeout=120) as response:
            target.write_bytes(response.read())
    return tmp_dir / f"{_SHAPEFILE_STEM}.shp"


def _clean_ac_name(value: str) -> str:
    return re.sub(r"\s*\((SC|ST)\)\s*$", "", value or "", flags=re.IGNORECASE).strip()


def _clean_district_name(value: str) -> str:
    return re.sub(r"\s+\*+$", "", (value or "").strip())


def _title_case_name(value: str) -> str:
    return " ".join(part.capitalize() for part in value.lower().split())


def build_geojson(shp_path: Path) -> dict:
    reader = shapefile.Reader(str(shp_path))
    try:
        field_names = [field[0] for field in reader.fields[1:]]
        st_index = field_names.index("ST_CODE")
        ac_no_index = field_names.index("AC_NO")
        ac_name_index = field_names.index("AC_NAME")
        dist_index = field_names.index("DIST_NAME")

        features: list[dict] = []
        for shape_record in reader.iterShapeRecords():
            record = shape_record.record
            if str(record[st_index]).strip() != _TN_ST_CODE:
                continue

            ac_number = int(record[ac_no_index])
            ac_name = _clean_ac_name(str(record[ac_name_index]))
            district = _title_case_name(_clean_district_name(str(record[dist_index])))

            properties = {
                key: record[index]
                for index, key in enumerate(field_names)
                if key not in {"Shape_Leng", "Shape_Area", "OBJECTID", "FID"}
            }
            properties["ac_number"] = ac_number
            properties["ac_name"] = ac_name
            properties["district"] = district
            properties["ST_CODE"] = str(properties.get("ST_CODE", _TN_ST_CODE))

            features.append(
                {
                    "type": "Feature",
                    "properties": properties,
                    "geometry": shape_record.shape.__geo_interface__,
                }
            )
    finally:
        reader.close()

    features.sort(key=lambda feature: feature["properties"]["ac_number"])
    if len(features) != 234:
        raise RuntimeError(f"Expected 234 Tamil Nadu constituencies, found {len(features)}")

    ac_numbers = [feature["properties"]["ac_number"] for feature in features]
    if ac_numbers != list(range(1, 235)):
        missing = sorted(set(range(1, 235)) - set(ac_numbers))
        raise RuntimeError(f"Missing AC numbers in boundary data: {missing[:10]}")

    return {"type": "FeatureCollection", "features": features}


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        shp_path = _download_shapefile(Path(tmp))
        geojson = build_geojson(shp_path)

    _OUTPUT.write_text(
        json.dumps(geojson, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Wrote {_OUTPUT} ({_OUTPUT.stat().st_size:,} bytes, {len(geojson['features'])} features)")

    manifest = {
        "source": "DataMeet Community Maps — Assembly Constituencies",
        "source_url": "https://projects.datameet.org/maps/assembly-constituencies/",
        "license": "Creative Commons Attribution 2.5 India",
        "fetchedAt": datetime.now(_KOLKATA).isoformat(timespec="seconds"),
        "feature_count": len(geojson["features"]),
        "filter": f"ST_CODE={_TN_ST_CODE}",
        "notes": "Boundaries joined to tn_constituencies.json manifest via ac_number.",
    }
    _MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {_MANIFEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
