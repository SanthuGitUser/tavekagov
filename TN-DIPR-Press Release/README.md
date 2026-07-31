# TN DIPR — Press releases

This folder syncs **DIPR press releases** from the Tamil Nadu Department of Public Relations API into daily JSON files for the TavekaGov dashboard.

It also includes a standalone **PDF downloader** for local use on Windows.

## Data source

- Web page: [dipr.tn.gov.in/press-release1.html](https://dipr.tn.gov.in/press-release1.html)
- API: `https://dipr.tn.gov.in/dipr_api/v1/general/pressReleases/press_release?date=YYYY-MM-DD`

## Sync script (`tn_press_release_sync.py`)

Fetches releases for each day in a date range and writes:

`Response JSON/YYYY-MM-DD.json`

### Setup

```powershell
copy "..\Sync-Config\.env.example" "..\Sync-Config\.env"
cd "TN-DIPR-Press Release"
python -m pip install -r requirements.txt
```

Shared settings (`TN_PRESS_RELEASE_SOURCE_URL`, `TN_PRESS_RELEASE_START_DATE`) live in `Sync-Config/.env`.

### Run

Fetch from the configured start date through yesterday (default):

```powershell
python tn_press_release_sync.py
```

Fetch a specific date range (`DD-MM-YYYY`):

```powershell
python tn_press_release_sync.py --start-date 10-05-2026 --end-date 31-07-2026
```

Fetch today only:

```powershell
$TODAY = Get-Date -Format "dd-MM-yyyy"
python tn_press_release_sync.py --start-date $TODAY --end-date $TODAY
```

### Output shape

Each daily file wraps the DIPR API response:

```json
{
  "date": "2026-07-30",
  "fetchedAt": "...",
  "lastFetchedAt": "...",
  "fetchCount": 1,
  "request": { "method": "GET", "url": "...", "params": { "date": "2026-07-30" } },
  "response": {
    "success": 1,
    "data": [
      {
        "id": 22242,
        "press_name": "DIPR-PR No.-464-...",
        "press_file_name": "/uploads/tn_govt_press_release/....pdf",
        "pr_date": "2026-07-30"
      }
    ]
  }
}
```

Re-runs merge items in `response.data` by DIPR `id` (incoming wins).

### GitHub Actions

The workflow [fetch-tn-dipr-press-releases.yml](../.github/workflows/fetch-tn-dipr-press-releases.yml) runs daily at **11:00 PM IST** with `--start-date` and `--end-date` set to the current date.

### Dashboard

Consumed by `web/src/lib/tamilNaduPressReleaseFeed.ts` → **Press Releases** page and dashboard KPIs.

---

## PDF downloader (`dipr_press_release_download.py`)

Optional Windows helper that downloads PDF files to a local date folder (not used by the web dashboard).

### Setup (PowerShell)

```powershell
cd "TN-DIPR-Press Release"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Or run `.\setup.ps1` if present.

### Run

Download **Press Release** PDFs for **today**:

```powershell
python dipr_press_release_download.py
```

Include **Press Notes**:

```powershell
python dipr_press_release_download.py --include-notes
```

Pick a specific date:

```powershell
python dipr_press_release_download.py --date 2026-07-15 --include-notes
```

PDFs save under `.\YYYY-MM-DD\Press Release\` (and `Press Notes\` when enabled).

---

## Related docs

- [docs/SYNC_SCRIPTS.md](../docs/SYNC_SCRIPTS.md)
- [docs/DATA.md](../docs/DATA.md)
