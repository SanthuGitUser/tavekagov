# TavekaGov Web Dashboard

Static dashboard for Tamil Nadu government open data. Most datasets are bundled as JSON from the repo at build time; News and the TVK Manifesto load JSON on demand when their pages open. Served from GitHub Pages.

See also the root [README](../README.md) and [docs/DATA.md](../docs/DATA.md).

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn-style UI components
- TanStack Table
- React Router

## Pages

Primary navigation:

- **Dashboard** — KPI cards with optional date range
- **News** — Tamil Nadu headlines (one day at a time)
- **Govt Publications** — Press releases, press release images, government orders, IAS transfers and postings, government schemes, magazines
- **Govt Administration** — Ministers, departments, constituencies, districts
- **TVK Manifesto** — Election manifesto by category (Aram, Inbam, Porul) with search
- **About** — Project overview and data sources

Also: **Home** (landing). Legacy `/government` redirects to `/ministers`. Unknown URLs show a 404 page.

Heavy pages are code-split with React `lazy()` and show a loading spinner while their chunk loads.

## Local development

```powershell
cd web
copy .env.example .env.local
npm install
npm run dev
```

`VITE_BASE_PATH` is optional. Use `/tavekagov/` when previewing the GitHub Pages project-site layout.

## Build

```powershell
npm run build
npm run preview
```

For GitHub project pages (repo name `tavekagov`):

```powershell
$env:VITE_BASE_PATH="/tavekagov/"
npm run build
```

## GitHub Pages deploy

`.github/workflows/deploy-web.yml` builds and deploys `web/dist` on push to `main`.

The workflow sets `VITE_BASE_PATH=/tavekagov/` for project pages. Use `/` for a user site at `username.github.io`.

No database or API secrets are required for the web build.

## Districts page

The Districts view combines:

- **Map** — 2D SVG map from `TN-Map/tamil-nadu-districts.geojson` with zoom/pan, district labels, constituency counts on hover, and live weather badges (Open-Meteo)
- **Tiles** — District cards with tn.gov.in photos, weather summary, population, area, and constituency count
- **Search** — Filters both the map highlight and tile grid

District tile images load from tn.gov.in using manifest names, with filename overrides in `src/lib/districtImageUtils.ts` when the remote file name differs (for example `The Nilgiris` → `TheNilgiris.png`).
