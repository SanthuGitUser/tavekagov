# Data retention

TavekaGov keeps its data as JSON in git. Daily feeds grow every day, and everything under `Response-JSON/` is bundled into the website build, so old daily files are archived automatically.

## Daily JSON (`Response-JSON/YYYY-MM-DD.json`)

Feeds: DIPR press releases, tn.gov.in press releases, DVAC, IAS transfers, News, Tamil Arasu magazine.

| Setting | Default | Where |
|---------|---------|-------|
| Retention window | **12 months** | `--keep-months N`, or `DATA_RETENTION_MONTHS=N` in `Sync-Config/.env` |
| Archive location | `<feed>/archive/YYYY/YYYY-MM-DD.json` | — |
| When it runs | Every `scripts/sync-all.ps1` run (skip with `-SkipRetention`) | — |

A file is kept when its date is on or after the 1st of the month N months ago. Older files are **moved**, not deleted:

- they stay in the repository and in git history;
- the dashboard no longer bundles them (it only reads `Response-JSON/`), so the site build stays small;
- if a scraper re-fetches an old day (for example with `-StartDate`), the next run moves the new copy into the archive, replacing the old one.

Preview what would move:

```powershell
python Sync-Config/data_retention.py --dry-run
python Sync-Config/data_retention.py --dry-run --keep-months 6
```

## Manifest snapshots (`manifests/*.json`)

Replaced or merged on each sync. Only the latest committed version is used by the dashboard.

## Government orders

One file per department under `TN-Government-Orders/Response-JSON/`, not per day, so they are **not** archived. G.O.s are filtered from **10 May 2026** onward by default (see `Sync-Config/.env`).

## Finance notifications

Only titles and links to the official PDFs are stored. PDFs are not downloaded or re-hosted.

## Election results

Form 20 and round-wise manifests under `TN-Election-Results/` are updated via `scripts/sync-election.ps1` (manual import), not daily scrapers. They are not archived.

## Related

- [DATA.md](DATA.md) — formats and feed modules
- [SYNC_SCRIPTS.md](SYNC_SCRIPTS.md) — sync commands
