# TavekaGov

Open-data platform for Tamil Nadu government publications and directories. Python sync scripts scrape official sources into JSON files in this repository, and a static React dashboard presents them for browsing and search.

**Live dashboard:** [santhugituser.github.io/tavekagov](https://santhugituser.github.io/tavekagov/)

> **Disclaimer:** This is an independent project, not affiliated with the Government of Tamil Nadu. See [docs/DISCLAIMER.md](docs/DISCLAIMER.md).

## Quick start (dashboard only)

```powershell
git clone https://github.com/santhugituser/tavekagov.git
cd tavekagov/web
copy .env.example .env.local
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). JSON data is already in the repo — no Python setup required to browse locally.

## What it includes

| Area | Source | Storage | UI tab |
|------|--------|---------|--------|
| DIPR press releases | [dipr.tn.gov.in](https://dipr.tn.gov.in/press-release1.html) | `TN-DIPR-Press Release/Response JSON/` | Press Releases |
| Government press release images | [tn.gov.in](https://www.tn.gov.in/press_release.php) | `TN-GOV-Press Release/Response JSON/` | Press Releases Images |
| Government orders (G.O.s) | [tn.gov.in](https://www.tn.gov.in/godept_list.php) | `TN-Government Orders/Response JSON/` | Government Orders |
| IAS transfers & postings | [tn.gov.in](https://tnsectdemo.tn.gov.in/ias/transferandpostings.php) | `TN-IAS_Transfers-Postings/Response JSON/` | Transfers and Postings |
| Departments (directory) | [tn.gov.in](https://www.tn.gov.in/department_list.php) | `TN-GOV_Departments/manifests/tn_departments.json` | Departments |
| Council of ministers | [tn.gov.in](https://www.tn.gov.in/minister_list.php) | `TN-GOV_Council Of Ministers/manifests/tn_ministers.json` | Ministers |
| Districts | [tn.gov.in](https://www.tn.gov.in/district_list.php) | `TN-GOV_Districts/manifests/tn_districts.json` | Districts |
| District map boundaries | [india-maps-data](https://github.com/udit-001/india-maps-data) | `TN-Map/tamil-nadu-districts.geojson` | Districts (map) |
| Tamil Arasu magazine | [Tamil Digital Library](https://tamildigitallibrary.in/) | `TN-TVA-Magazine/manifests/magazine.json` (+ optional `Response JSON/`) | Magazine |
| Tamil Nadu news | [NewsData.io](https://newsdata.io/) | `TN-News/Response JSON/` | News |

Daily scrapers write one JSON file per date under each folder's `Response JSON/`. Government orders use one JSON file per department. Directory syncs (departments, ministers, districts) and the magazine manifest are single snapshot files refreshed by scheduled jobs.

### `TN-GOV_Departments` vs `TN-Government Orders`

These names look similar but serve different purposes:

| Folder | What it stores | tn.gov.in page |
|--------|----------------|----------------|
| `TN-GOV_Departments` | **Department directory** — names, IDs, minister assignments | [department_list.php](https://www.tn.gov.in/department_list.php) |
| `TN-Government Orders` | **Government Orders (G.O.s)** — order number, subject, PDF link by department | [godept_list.php](https://www.tn.gov.in/godept_list.php) |

**GO** here means **Government Order**, not "go to departments."

## Architecture

```
Official TN gov sites          Python sync scripts          JSON in this repo
        │                              │                              │
        └──────── scrape / parse ──────┴────── write JSON ──────────────┘
                                                    │
                                                    ▼
                                         React dashboard (GitHub Pages)
                                         Bundles JSON at build time
```

No database is used at runtime. The web app reads JSON via Vite `import.meta.glob` and ships it in the static build. See [docs/DATA.md](docs/DATA.md) for file formats.

## Repository layout

```
tavekagov/
├── web/                          # Vite + React dashboard (see web/README.md)
├── Sync-Config/                  # Shared sync settings (.env) and JSON helpers
├── docs/                         # Project documentation (see below)
├── TN-DIPR-Press Release/        # DIPR press release sync + PDF downloader
├── TN-GOV-Press Release/         # tn.gov.in press release image sync
├── TN-Government Orders/         # Government orders (G.O.s) sync
├── TN-GOV_Departments/           # Department directory sync (not G.O.s)
├── TN-IAS_Transfers-Postings/    # IAS transfers & postings sync
├── TN-GOV_Council Of Ministers/  # Ministers sync
├── TN-GOV_Districts/             # District directory sync
├── TN-TVA-Magazine/              # Tamil Arasu magazine sync
├── TN-News/                      # Daily news fetch (NewsData.io)
├── scripts/                      # Utility scripts (e.g. GitHub Pages setup)
└── .github/workflows/            # CI: deploy web
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/DATA.md](docs/DATA.md) | JSON architecture, schemas, feed modules |
| [docs/SYNC_SCRIPTS.md](docs/SYNC_SCRIPTS.md) | All Python sync scripts and CLI flags |
| [docs/GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md) | Scheduled workflows, secrets, fork setup |
| [docs/DISCLAIMER.md](docs/DISCLAIMER.md) | Non-affiliation, data accuracy, usage |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |
| [SECURITY.md](SECURITY.md) | Reporting vulnerabilities |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards |
| [web/README.md](web/README.md) | Frontend development and deploy |
| [Sync-Config/README.md](Sync-Config/README.md) | Shared Python configuration |

## Prerequisites

- **Node.js 22+** — web dashboard
- **Python 3.12+** — sync scripts (optional for local data refresh)
- **NewsData.io API key** *(optional)* — for the Tamil Nadu news feed

## Setup

### 1. Shared sync settings

Copy the example env file and adjust source URLs or start dates if needed:

```powershell
copy "Sync-Config\.env.example" "Sync-Config\.env"
```

For news fetch only, add `NEWSDATA_API_KEY` to `Sync-Config/.env`.

### 2. Sync data

Each data module has its own folder with a `requirements.txt` and a `*_sync.py` script. See [docs/SYNC_SCRIPTS.md](docs/SYNC_SCRIPTS.md) for the full reference.

Recommended: run all sync jobs in one command:

```powershell
.\scripts\sync-all.ps1 -DryRun
.\scripts\sync-all.ps1
```

```powershell
cd "TN-GOV_Departments"
python -m pip install -r requirements.txt
python tn_dept_sync.py
```

| Script | Folder | Output |
|--------|--------|--------|
| `tn_dept_sync.py` | `TN-GOV_Departments/` | `manifests/tn_departments.json` |
| `tn_ministers_sync.py` | `TN-GOV_Council Of Ministers/` | `manifests/tn_ministers.json` |
| `tn_districts_sync.py` | `TN-GOV_Districts/` | `manifests/tn_districts.json` |
| `tn_government_orders_sync.py` | `TN-Government Orders/` | `Response JSON/<department>.json` |
| `tn_press_release_sync.py` | `TN-DIPR-Press Release/` | `Response JSON/YYYY-MM-DD.json` |
| `tn_gov_press_release_sync.py` | `TN-GOV-Press Release/` | `Response JSON/YYYY-MM-DD.json` |
| `tn_transfers_postings_sync.py` | `TN-IAS_Transfers-Postings/` | `Response JSON/YYYY-MM-DD.json` |
| `tn_magazine_sync.py` | `TN-TVA-Magazine/` | `manifests/magazine.json` (+ daily JSON) |
| `fetch_tamil_nadu_news.py` | `TN-News/Code/` | `TN-News/Response JSON/YYYY-MM-DD.json` |

### 3. Run the web dashboard locally

```powershell
cd web
copy .env.example .env.local
npm install
npm run dev
```

Optional: set `VITE_BASE_PATH=/tavekagov/` in `web/.env.local` when previewing the GitHub Pages layout.

See [web/README.md](web/README.md) for build, preview, and GitHub Pages details.

### 4. Fetch Tamil Nadu news *(optional)*

```powershell
cd "TN-News\Code"
python -m pip install -r requirements.txt
python fetch_tamil_nadu_news.py
```

Requires `NEWSDATA_API_KEY` in `Sync-Config/.env`.

### 5. Deploy updates to GitHub Pages

Pushing changes to `main` triggers `.github/workflows/deploy-web.yml`, which builds `web/dist` and deploys the dashboard to GitHub Pages. This includes JSON updates under the `TN-*` folders used by the web app.

## Fork and deploy your own

1. **Fork** this repository on GitHub.
2. **Enable GitHub Pages** — Settings → Pages → Source: **GitHub Actions**.
3. **Add secret** `NEWSDATA_API_KEY` if you want the news workflow (Settings → Secrets → Actions).
4. **Update base path** if your repo name differs from `tavekagov`:
   - `.github/workflows/deploy-web.yml` → `VITE_BASE_PATH`
   - For a user site at `username.github.io`, use `/` instead of `/tavekagov/`.
5. Push to `main` — Actions will deploy the dashboard.

See [docs/GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md) for permissions, deploy triggers, and manual workflow runs.

## Web dashboard

Built with Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Table, and Recharts. Pages include:

- **Home** — Welcome links to Dashboard and Districts
- **Dashboard** — KPIs, activity chart, recent press releases, news category chart
- **Press Releases** — DIPR releases with search, PDF links, and department/minister browse tabs
- **Press Releases Images** — Government press release photos from tn.gov.in with category filters
- **Government Orders** — Department G.O.s with timeline and table views
- **Transfers & Postings** — IAS G.O.s
- **Departments, Ministers** — Directory listings
- **Districts** — Interactive 2D map (38 districts, 234 constituencies), live weather, searchable district tiles with population, area, and constituency counts
- **Magazine** — Tamil Arasu issues from the Tamil Digital Library
- **News** — Curated Tamil Nadu news headlines
- **About** — Project overview and data sources

## Deployment

Push to `main` triggers `.github/workflows/deploy-web.yml`, which builds `web/dist` and deploys to GitHub Pages at `/tavekagov/`.

No database configuration is required.

## Security

- Do not commit API keys. Use `Sync-Config/.env` locally and GitHub Actions secrets for `NEWSDATA_API_KEY`.
- `.env` and `.env.local` are gitignored.
- See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before opening a PR.

## License

[MIT License](LICENSE) — Copyright (c) 2026 SanthuGitUser
