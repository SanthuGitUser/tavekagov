# TavekaGov

Open-data platform for Tamil Nadu government publications and directories. Python sync scripts scrape official sources, store structured data in [Supabase](https://supabase.com/), and a static React dashboard presents it for browsing and search.

**Live dashboard:** [santhugituser.github.io/tavekagov](https://santhugituser.github.io/tavekagov/)

## What it includes

| Area | Source | Storage |
|------|--------|---------|
| DIPR press releases | [dipr.tn.gov.in](https://dipr.tn.gov.in/press-release1.html) | Supabase |
| Government press release images | [tn.gov.in](https://www.tn.gov.in/press_release.php) | Supabase |
| Government orders (G.O.s) | [tn.gov.in](https://www.tn.gov.in/godept_list.php) | Supabase |
| IAS transfers & postings | [tn.gov.in](https://tnsectdemo.tn.gov.in/ias/transferandpostings.php) | Supabase |
| Departments | [tn.gov.in](https://www.tn.gov.in/department_list.php) | Supabase |
| Council of ministers | [tn.gov.in](https://www.tn.gov.in/minister_list.php) | Supabase |
| Districts | [tn.gov.in](https://www.tn.gov.in/district_list.php) | Supabase |
| Tamil Arasu magazine | [Tamil Digital Library](https://tamildigitallibrary.in/) | Supabase |
| Tamil Nadu news | [NewsData.io](https://newsdata.io/) | JSON in repo |

## Architecture

```
Official TN gov sites          Python sync scripts          Supabase (Postgres + RLS)
        │                              │                              │
        └──────── scrape / parse ──────┴────── upsert ─────────────────┘
                                                    │
                                                    ▼
                                         React dashboard (GitHub Pages)
                                         Supabase anon key + public read policies
```

News is fetched separately into `TN-News/Response JSON/` and served as static JSON bundled with the web app.

## Repository layout

```
tavekagov/
├── web/                          # Vite + React dashboard (see web/README.md)
├── Public DB/                    # Supabase schema, client helpers, shared .env
├── TN-DIPR-Press Release/        # DIPR press release sync + PDF downloader
├── TN-GOV-Press Release/           # tn.gov.in press release image sync
├── TN-GOV_GO-Departments/          # Government orders sync
├── TN-IAS_Transfers-Postings/      # IAS transfers & postings sync
├── TN-GOV_Departments/             # Department directory sync
├── TN-GOV_Council Of Ministers/    # Ministers sync
├── TN-GOV_Districts/               # District directory sync
├── TN-TVA-Magazine/                # Tamil Arasu magazine sync
├── TN-News/                        # Daily news fetch (NewsData.io)
├── scripts/                        # Utility scripts (e.g. GitHub Pages setup)
└── .github/workflows/              # CI: deploy web, fetch news
```

## Prerequisites

- **Node.js 22+** — web dashboard
- **Python 3.12+** — sync scripts
- **Supabase project** — Postgres database with Row Level Security enabled
- **NewsData.io API key** *(optional)* — for the Tamil Nadu news feed

## Setup

### 1. Supabase and environment

Copy the example env file and fill in your project credentials:

```powershell
copy "Public DB\.env.example" "Public DB\.env"
```

Required keys:

| Variable | Used by |
|----------|---------|
| `SUPABASE_URL` | Sync scripts, web app |
| `SUPABASE_ANON_KEY` | Web app (browser-safe with RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sync scripts only — **never expose in client code** |
| `DATABASE_URL` or `SUPABASE_DB_PASSWORD` | Schema migration scripts |

Source URLs and start dates for sync jobs are also configured in `Public DB/.env.example`.

### 2. Apply database schema

```powershell
cd "Public DB"
python -m pip install -r requirements.txt
python apply_schema.py
```

Additional migration scripts in `Public DB/` add columns and tables for newer data types (press release parsing, G.O. flags, etc.). Run them as needed after the base schema.

### 3. Sync data

Each data module has its own folder with a `requirements.txt` and a `*_sync.py` script. Typical workflow:

```powershell
cd "TN-GOV_Departments"
python -m pip install -r requirements.txt
python tn_dept_sync.py          # live sync
python tn_dept_sync.py --dry-run  # preview without writing
```

| Script | Folder |
|--------|--------|
| `tn_dept_sync.py` | `TN-GOV_Departments/` |
| `tn_ministers_sync.py` | `TN-GOV_Council Of Ministers/` |
| `tn_districts_sync.py` | `TN-GOV_Districts/` |
| `tn_go_dept_sync.py` | `TN-GOV_GO-Departments/` |
| `tn_press_release_sync.py` | `TN-DIPR-Press Release/` |
| `tn_gov_press_release_sync.py` | `TN-GOV-Press Release/` |
| `tn_transfers_postings_sync.py` | `TN-IAS_Transfers-Postings/` |
| `tn_magazine_sync.py` | `TN-TVA-Magazine/` |

The DIPR folder also includes a standalone PDF downloader — see [TN-DIPR-Press Release/README.md](TN-DIPR-Press%20Release/README.md).

### 4. Run the web dashboard locally

```powershell
cd web
copy .env.example .env.local
# Edit .env.local, or rely on Public DB/.env (loaded automatically)
npm install
npm run dev
```

Restart the dev server after changing env files. The header should show **Live data**, not **Demo mode**.

See [web/README.md](web/README.md) for build, preview, and GitHub Pages details.

### 5. Fetch Tamil Nadu news *(optional)*

```powershell
cd "TN-News\Code"
python -m pip install -r requirements.txt
python fetch_tamil_nadu_news.py
```

A GitHub Actions workflow runs this daily at 11:00 PM IST and commits new JSON to the repo.

## Web dashboard

Built with Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Table, and Recharts. Pages include:

- **Dashboard** — KPIs, activity chart, recent press releases
- **Press Releases** — DIPR releases with search and PDF links
- **PR Images** — Government press release photos from tn.gov.in
- **Government Orders** — Department G.O.s with timeline and table views
- **Transfers & Postings** — IAS G.O.s
- **Departments, Ministers, Districts** — Directory listings
- **Magazine** — Tamil Arasu issues from the Tamil Digital Library
- **News** — Curated Tamil Nadu news headlines
- **About** — Project overview and connection status

## Deployment

### GitHub Pages (web dashboard)

Push to `main` triggers `.github/workflows/deploy-web.yml`, which builds `web/dist` and deploys to GitHub Pages.

Add these repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For a project site at `https://<user>.github.io/tavekagov/`, the workflow sets `VITE_BASE_PATH=/tavekagov/`.

### Automated news fetch

`.github/workflows/fetch-tamil-nadu-news.yml` runs on a daily schedule (and on manual dispatch). Requires the `NEWSDATA_API_KEY` secret.

## Security

- Only the Supabase **anon** key belongs in frontend code or GitHub Actions build secrets for the web app.
- The **service role** key bypasses RLS — keep it in `Public DB/.env` locally and never commit it.
- All Supabase tables use Row Level Security with public read policies for anonymous users.
- `.env` and `.env.local` are gitignored.

## License

No license file is included yet. Add one if you plan to open-source or share this project.
