# Sync scripts reference

Each data module lives under `TN-*/` with its own `requirements.txt` and sync script. All scripts read shared settings from [Sync-Config](../Sync-Config/) (`config.py`, optional `.env`).

## Quick start

```powershell
# One-time shared config
copy "Sync-Config\.env.example" "Sync-Config\.env"

# Example: sync departments
cd TN-GOV_Departments
python -m pip install -r requirements.txt
python tn_dept_sync.py
```

## Script table

| Script | Folder | Output |
|--------|--------|--------|
| `scripts/sync-all.ps1` | `scripts/` | Runs all sync jobs (recommended) |
| `tn_press_release_sync.py` | [TN-DIPR-Press Release](../TN-DIPR-Press%20Release/) | `Response JSON/YYYY-MM-DD.json` |
| `tn_gov_press_release_sync.py` | [TN-GOV-Press Release](../TN-GOV-Press%20Release/) | `Response JSON/YYYY-MM-DD.json` |
| `tn_government_orders_sync.py` | [TN-Government Orders](../TN-Government%20Orders/) | `Response JSON/<department>.json` |
| `tn_transfers_postings_sync.py` | [TN-IAS_Transfers-Postings](../TN-IAS_Transfers-Postings/) | `Response JSON/YYYY-MM-DD.json` |
| `tn_magazine_sync.py` | [TN-TVA-Magazine](../TN-TVA-Magazine/) | `manifests/magazine.json`, `Response JSON/` |
| `tn_dept_sync.py` | [TN-GOV_Departments](../TN-GOV_Departments/) | `manifests/tn_departments.json` |
| `tn_ministers_sync.py` | [TN-GOV_Council Of Ministers](../TN-GOV_Council%20Of%20Ministers/) | `manifests/tn_ministers.json` |
| `tn_districts_sync.py` | [TN-GOV_Districts](../TN-GOV_Districts/) | `manifests/tn_districts.json` |
| `fetch_tamil_nadu_news.py` | [TN-News/Code](../TN-News/Code/) | `TN-News/Response JSON/YYYY-MM-DD.json` |

## Run everything (recommended)

`scripts/sync-all.ps1` runs all sync jobs in a single command. Each script resumes
from the last successful run using `Sync-Config/last-sync.json` (and existing
`Response JSON/YYYY-MM-DD.json` files as a fallback). The end date defaults to
**today (IST)** for date-range sources.

```powershell
.\scripts\sync-all.ps1 -DryRun
.\scripts\sync-all.ps1
```

Inspect planned ranges without fetching:

```powershell
python Sync-Config/sync_state.py --plan
```

Optional flags:

```powershell
.\scripts\sync-all.ps1 -SkipInstall
.\scripts\sync-all.ps1 -SkipTransfersPdfParse
.\scripts\sync-all.ps1 -Stage
.\scripts\sync-all.ps1 -Commit -CommitMessage "chore: sync data"
.\scripts\sync-all.ps1 -Push
```

## CLI flags

### Date-range scrapers

Used by DIPR press releases, gov PR images, and transfers.

```powershell
python tn_transfers_postings_sync.py --start-date 10-05-2026 --end-date 31-07-2026
```

| Flag | Format | Default |
|------|--------|---------|
| `--start-date` | `DD-MM-YYYY` | Day after last sync (`Sync-Config/last-sync.json`), else `TN_*_START_DATE` in `.env` |
| `--end-date` | `DD-MM-YYYY` | Today (Asia/Kolkata) |
| `--output-dir` | path | `Response JSON/` in module folder |

### DIPR press releases (`tn_press_release_sync.py`)

- API: `https://dipr.tn.gov.in/dipr_api/v1/general/pressReleases/press_release?date=YYYY-MM-DD`
- Merges by DIPR `id` on re-run
- See [TN-DIPR-Press Release/README.md](../TN-DIPR-Press%20Release/README.md)

### Gov PR images (`tn_gov_press_release_sync.py`)

- Scrapes `tn.gov.in` press release archive pages by month
- Enriches titles with minister/department IDs from manifests
- Optional backfill: `--start-date` / `--end-date`

### Government orders (`tn_government_orders_sync.py`)

- Scrapes `godept_list.php` and fetches each department's G.O. page
- One JSON file per department under `Response JSON/`
- Only includes G.O.s from **10 May 2026** onward (configurable via `--start-date`)
- Refresh existing files: `python tn_government_orders_sync.py --from-existing --replace-orders`

```powershell
python tn_government_orders_sync.py
python tn_government_orders_sync.py --from-existing --replace-orders
python tn_government_orders_sync.py --start-date 10-05-2026 --end-date 31-07-2026
```

| Flag | Purpose |
|------|---------|
| `--from-existing` | Refresh JSON files already in `Response JSON/` |
| `--replace-orders` | Replace the `orders` array instead of merging |
| `--start-date` / `--end-date` | Filter G.O.s by date (`DD-MM-YYYY`) |
| `--output-dir` | Output folder (default: `Response JSON/`) |

### Transfers & postings (`tn_transfers_postings_sync.py`)

- Scrapes IAS transfer G.O.s from `tnsectdemo.tn.gov.in`
- Downloads each G.O. PDF during sync and extracts **name**, **old post**, and **new post** via Tesseract OCR (PDFs are scanned images)
- Output key: `postings[]` with nested `officers[]` and `parse_status`
- Requires [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) on the machine running the sync

| Flag | Purpose |
|------|---------|
| `--skip-pdf-parse` | Listing only; skip PDF download and officer parsing |
| `--start-date` / `--end-date` | Filter G.O.s by date (`DD-MM-YYYY`) |

### Magazine (`tn_magazine_sync.py`)

```powershell
python tn_magazine_sync.py
python tn_magazine_sync.py --since-date 10-05-2026
python tn_magazine_sync.py --month 6 --year 2026
```

| Flag | Purpose |
|------|---------|
| `--since-date` | Include issues from this month onward (`DD-MM-YYYY`) |
| `--month` / `--year` | Fetch a single issue month (both required) |
| `--max-pages` | Max library list pages to scan (default 25) |

Writes rolling `manifests/magazine.json` and merges into daily JSON.

### Manifest syncs (departments, ministers, districts)

No date arguments — full refresh each run:

```powershell
python tn_dept_sync.py
python tn_ministers_sync.py
python tn_districts_sync.py
```

### News (`fetch_tamil_nadu_news.py`)

Requires `NEWSDATA_API_KEY` in `Sync-Config/.env`:

```powershell
cd TN-News\Code
python fetch_tamil_nadu_news.py
python fetch_tamil_nadu_news.py --max-pages 2
```

## Utility scripts

| Script | Purpose |
|--------|---------|
| `TN-DIPR-Press Release/dipr_press_release_download.py` | Download PDFs locally (Windows helper) |
| `TN-GOV-Press Release/tn_gov_press_release_parse_titles.py` | Title parsing audit CLI |
| `TN-*/migrate_manifests_to_daily_json.py` | One-off manifest → daily JSON migration (where present) |

## Environment variables

See [Sync-Config/.env.example](../Sync-Config/.env.example). Key variables:

| Variable | Used by |
|----------|---------|
| `TN_GOV_BASE_URL` | tn.gov.in scrapers |
| `TN_PRESS_RELEASE_START_DATE` | DIPR sync first-run default |
| `TN_GO_START_DATE` | G.O.s, gov PR images, magazine first-run default |
| `NEWSDATA_API_KEY` | News fetch only |

Checkpoint file: `Sync-Config/last-sync.json` (see `last-sync.json.example`).

## Related docs

- [DATA.md](DATA.md) — JSON file formats
- [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) — deploy workflow
- [CONTRIBUTING.md](../CONTRIBUTING.md) — how to submit changes
