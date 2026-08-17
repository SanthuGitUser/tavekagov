# TN-DVAC Press Release

Fetches DVAC press releases from `https://www.dvac.tn.gov.in/Press_Release.html` and writes one JSON file per release date into `Response JSON/YYYY-MM-DD.json`.

## Usage

```bash
python tn_dvac_press_release_sync.py
python tn_dvac_press_release_sync.py --start-date 01-05-2026 --end-date 16-08-2026
```

The default end date is **yesterday** (Asia/Kolkata) to avoid partial same-day updates.

