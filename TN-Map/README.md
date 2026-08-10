# TN-Map

District boundary GeoJSON for the interactive Tamil Nadu map in the web dashboard.

## Files

| File | Purpose |
|------|---------|
| `tamil-nadu-districts.geojson` | Polygon boundaries (38 districts) |
| `tamil-nadu-constituencies.geojson` | Assembly constituency boundaries (234 ACs) |
| `district-name-aliases.json` | Maps GeoJSON `properties.district` names to tn.gov.in names |
| `district-constituencies.json` | Assembly constituency count per district (234 total) |
| `constituency-boundaries-manifest.json` | DataMeet boundary source metadata |
| `manifest.json` | District boundary source metadata |
| `build_constituency_counts.py` | Regenerate `district-constituencies.json` |
| `fetch_constituency_boundaries.py` | Download DataMeet AC shapefile and build TN GeoJSON |

## Source

- Base boundaries: [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data)
- **Mayiladuthurai** (2020 bifurcation from Nagapattinam): [MapIt / OpenStreetMap](https://global.mapit.mysociety.org/area/1225592.html)
- Updated **Nagapattinam** boundary: [MapIt / OpenStreetMap](https://global.mapit.mysociety.org/area/797093.html)

To refresh:

```powershell
python TN-Map/fetch_boundaries.py
python TN-Map/fetch_constituency_boundaries.py
python TN-Map/build_constituency_counts.py
```

## Usage in the web app

The React dashboard imports district GeoJSON via `web/src/lib/tamilNaduMapFeed.ts` on **`/districts`**, and constituency GeoJSON via `web/src/lib/tamilNaduConstituencyMapFeed.ts` on **`/constituencies`**.

Features wired to this data:

- Constituency counts on hover/selection from `district-constituencies.json` via `web/src/lib/tamilNaduConstituencies.ts`
- Live district weather and AQI badges from Open-Meteo via `web/src/hooks/useDistrictWeather.ts`
- Name alignment between GeoJSON and tn.gov.in manifests via `district-name-aliases.json`
