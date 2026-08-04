# Data architecture

TavekaGov uses a **JSON-first** pipeline: Python sync scripts write JSON into this repository; the React dashboard bundles that JSON at build time via Vite. There is no runtime database.

## End-to-end flow

```
Official sources  →  Python *_sync.py  →  JSON in repo  →  web/src/lib/*Feed.ts  →  static build
```

1. **Sync scripts** fetch or scrape public TN government sites (and NewsData.io for news).
2. **JSON files** are committed to git (manually or by GitHub Actions).
3. **Feed modules** in `web/src/lib/` use `import.meta.glob` to load all matching JSON files at build time.
4. **GitHub Pages** serves the static `web/dist` output.

After JSON changes locally, restart `npm run dev` or run `npm run build` to see updates in the dashboard.

## Storage patterns

### Daily JSON (`Response JSON/YYYY-MM-DD.json`)

One file per calendar day. Used by scrapers that fetch date-range data.

| Folder | Items key | Merge key |
|--------|-----------|-----------|
| `TN-DIPR-Press Release/` | `response.data` (DIPR API shape) | DIPR `id` |
| `TN-GOV-Press Release/` | `releases` | `image_url` |
| `TN-IAS_Transfers-Postings/` | `postings` | `pdf_url` |
| `TN-TVA-Magazine/` | `magazines` | `id` |
| `TN-News/` | `response.results` | `article_id` |

Common metadata fields (where applicable):

| Field | Meaning |
|-------|---------|
| `date` | ISO date (`YYYY-MM-DD`) for the file |
| `fetchedAt` | First fetch timestamp (ISO 8601, Asia/Kolkata) |
| `lastFetchedAt` | Most recent fetch timestamp |
| `fetchCount` | Number of times this file was updated |
| `source_url` | Human-readable source page URL |
| `count` | Number of items after merge |

Re-runs **merge** new items with existing ones; incoming records win on duplicate keys.

### Manifest JSON (`manifests/*.json`)

Single rolling snapshot, replaced or merged on each sync. Used for directory-style data and the magazine catalog.

| File | Items key |
|------|-----------|
| `TN-GOV_Departments/manifests/tn_departments.json` | `departments` |
| `TN-GOV_Council Of Ministers/manifests/tn_ministers.json` | `ministers` |
| `TN-GOV_Districts/manifests/tn_districts.json` | `districts` |
| `TN-TVA-Magazine/manifests/magazine.json` | `magazines` |

Typical manifest shape:

```json
{
  "source_url": "https://www.tn.gov.in/department_list.php",
  "fetchedAt": "2026-08-01T00:40:52.746595+05:30",
  "count": 41,
  "departments": [ { "id": 2, "name": "...", "minister_name": "..." } ]
}
```

## JSON shapes by dataset

### DIPR press releases

Path: `TN-DIPR-Press Release/Response JSON/YYYY-MM-DD.json`

Uses the native DIPR API response wrapper (not the shared `daily_json.py` helper):

```json
{
  "date": "2026-07-30",
  "fetchedAt": "...",
  "lastFetchedAt": "...",
  "fetchCount": 1,
  "request": { "method": "GET", "url": "https://dipr.tn.gov.in/dipr_api/v1/...", "params": { "date": "2026-07-30" } },
  "response": {
    "success": 1,
    "data": [
      {
        "id": 22242,
        "press_name": "DIPR-PR No.-464-...",
        "press_file_name": "/uploads/tn_govt_press_release/....pdf",
        "pr_date": "2026-07-30",
        "language": "en"
      }
    ]
  }
}
```

Frontend feed: `web/src/lib/tamilNaduPressReleaseFeed.ts`

### Government press release images

Path: `TN-GOV-Press Release/Response JSON/YYYY-MM-DD.json`

```json
{
  "date": "2026-07-30",
  "releases": [
    {
      "image_url": "https://cms.tn.gov.in/cms_migrated/document/press_release/...",
      "release_date": "2026-07-30",
      "title": "...",
      "minister_name": "...",
      "department_name": "...",
      "minister_id": 12,
      "department_id": 24
    }
  ]
}
```

Daily files may also include `ministers[]` and `departments[]` reference snapshots. Frontend: `tamilNaduGovPressReleaseFeed.ts`.

### Government orders (G.O.s)

Path: `TN-Government Orders/Response JSON/<department-slug>.json`

One file per department. Re-runs replace the `orders` array when using `--replace-orders`.

```json
{
  "department_name": "Finance Department",
  "dep_id_encoded": "OQ==",
  "department_url": "https://www.tn.gov.in/go.php?dep_id=OQ==&year=MjAyNw==",
  "start_date": "10-05-2026",
  "count": 8,
  "orders": [
    {
      "go_date": "2026-07-28",
      "go_number": "G.O.Ms.No. 152",
      "go_name": "Finance Department – ...",
      "department_name": "Finance Department",
      "dep_id_encoded": "OQ==",
      "pdf_url": "https://cms.tn.gov.in/cms_migrated/document/GO/..."
    }
  ]
}
```

Only G.O.s on or after **10 May 2026** are included. Frontend: `tamilNaduGovernmentOrdersFeed.ts`.

### IAS transfers and postings

Path: `TN-IAS_Transfers-Postings/Response JSON/YYYY-MM-DD.json`

```json
{
  "date": "2026-06-16",
  "postings": [
    {
      "serial_number": 1,
      "go_date": "2026-06-16",
      "go_number": "G.O. Rt No.2127, dt 16.6.2026.pdf",
      "subject": "IAS TRANSFER AND POSTING",
      "pdf_url": "https://tnsectdemo.tn.gov.in/ias/Files/xfer/..."
    }
  ]
}
```

Frontend: `tamilNaduTransfersPostingsFeed.ts`.

### Tamil Arasu magazine

- Rolling catalog: `TN-TVA-Magazine/manifests/magazine.json`
- Optional daily snapshot: `TN-TVA-Magazine/Response JSON/YYYY-MM-DD.json`

```json
{
  "id": 42718,
  "name": "Tamil Arasu - Vol. 56, no. 12 (June, 2026)",
  "issue_date": "2026-06-01",
  "url": "https://tamildigitallibrary.in/assets/docs/uploads/...pdf"
}
```

Frontend: `tamilNaduMagazineFeed.ts` (reads manifest and daily JSON).

### Tamil Nadu news

Path: `TN-News/Response JSON/YYYY-MM-DD.json` (one file per **publication day** in IST)

Wraps the NewsData.io API response. The `request.params.apikey` field should be redacted in committed files.

Frontend: `tamilNaduNewsFeed.ts`.

## Date formats

| Context | Format | Example |
|---------|--------|---------|
| CLI arguments (`--start-date`, `--since-date`) | `DD-MM-YYYY` | `10-05-2026` |
| JSON filenames and `date` fields | `YYYY-MM-DD` | `2026-05-10` |
| Timestamps | ISO 8601 with timezone | `2026-08-01T00:40:52+05:30` |
| Scheduled jobs | Asia/Kolkata (IST) | 11:00 PM daily |

Default project start date for backfills: **10 May 2026** (`10-05-2026`), configured in `Sync-Config/.env`.

## Shared helpers

- `Sync-Config/config.py` — source URLs, start dates, `NEWSDATA_API_KEY`
- `Sync-Config/daily_json.py` — `save_daily_json()`, merge-by-key for daily files

## Web feed modules

| UI page | Feed module |
|---------|-------------|
| Dashboard, Press Releases | `tamilNaduPressReleaseFeed.ts` |
| PR Images | `tamilNaduGovPressReleaseFeed.ts` |
| Government Orders | `tamilNaduGovernmentOrdersFeed.ts` |
| Transfers & Postings | `tamilNaduTransfersPostingsFeed.ts` |
| Departments | `tamilNaduDepartmentsFeed.ts` |
| Ministers | `tamilNaduMinistersFeed.ts` |
| Districts | `tamilNaduDistrictsFeed.ts` |
| Magazine | `tamilNaduMagazineFeed.ts` |
| News | `tamilNaduNewsFeed.ts` |

## Related docs

- [SYNC_SCRIPTS.md](SYNC_SCRIPTS.md) — script reference and CLI flags
- [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md) — automated fetch and deploy
- [DISCLAIMER.md](DISCLAIMER.md) — data usage and non-affiliation notice
