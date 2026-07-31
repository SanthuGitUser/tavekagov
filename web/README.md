# TavekaGov Web Dashboard

Static dashboard for Tamil Nadu government open data. All datasets are bundled as JSON from the repo at build time and served from GitHub Pages.

See also the root [README](../README.md) and [docs/DATA.md](../docs/DATA.md).

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn-style UI components
- TanStack Table
- Recharts
- React Router

## Pages

- Dashboard (KPI cards, activity chart, recent press releases)
- Press releases
- PR images
- Government orders
- Transfers and postings
- Departments, ministers, districts
- Magazine
- News
- About

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
