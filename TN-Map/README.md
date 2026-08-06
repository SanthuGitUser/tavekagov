# TN-Map

District boundary GeoJSON for the interactive Tamil Nadu map in the web dashboard.

## Files

| File | Purpose |
|------|---------|
| `tamil-nadu-districts.geojson` | Polygon boundaries (38 districts) |
| `district-name-aliases.json` | Maps GeoJSON `properties.district` names to tn.gov.in names |
| `district-constituencies.json` | Assembly constituency count per district (234 total) |
| `manifest.json` | Source metadata |
| `build_constituency_counts.py` | Regenerate `district-constituencies.json` |

## Source

- Base boundaries: [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data)
- **Mayiladuthurai** (2020 bifurcation from Nagapattinam): [MapIt / OpenStreetMap](https://global.mapit.mysociety.org/area/1225592.html)
- Updated **Nagapattinam** boundary: [MapIt / OpenStreetMap](https://global.mapit.mysociety.org/area/797093.html)

To refresh:

```powershell
python TN-Map/fetch_boundaries.py
python TN-Map/build_constituency_counts.py
```

## Usage in the web app

The React dashboard imports this GeoJSON at build time via `web/src/lib/tamilNaduMapFeed.ts` and renders an interactive 2D SVG map on **`/districts`** (not on the home page).

Features wired to this data:

- Constituency counts on hover/selection from `district-constituencies.json` via `web/src/lib/tamilNaduConstituencies.ts`
- Live district weather and AQI badges from Open-Meteo via `web/src/hooks/useDistrictWeather.ts`
- Name alignment between GeoJSON and tn.gov.in manifests via `district-name-aliases.json`
