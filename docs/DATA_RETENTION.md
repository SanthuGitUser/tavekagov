# Data retention

TavekaGov stores historical JSON in git for transparency and reproducibility. This document describes retention expectations and optional cleanup strategies.

## Daily JSON (`Response JSON/YYYY-MM-DD.json`)

| Folder | Retention default | Notes |
|--------|-------------------|--------|
| DIPR / Gov PR / DVAC / IAS / News / Magazine daily | **Keep all committed files** | Merge-on-sync; re-runs update the same day file |
| News | Same | Requires `NEWSDATA_API_KEY` for new days |

**Optional archive:** Move files older than N months to `archive/YYYY/` on a separate branch, or export yearly tarballs as GitHub releases. Update feed globs if you change paths.

## Manifest snapshots (`manifests/*.json`)

Replaced or merged on each sync. Only the latest committed version is used by the dashboard.

## Government orders

One file per department under `TN-Government Orders/Response JSON/`. G.O.s are filtered from **10 May 2026** onward by default (see `Sync-Config/.env`).

## Election results

Form 20 and round-wise manifests under `TN-Election-Results/` are updated via `scripts/sync-election.ps1` (manual/scheduled import), not daily scrapers.

## Repository size

The committed data tree is tens of MB. Clone and CI build time grow with daily JSON volume. Prefer lazy-loaded feeds in `web/` (see `docs/DATA.md`) and periodic archival if the repo becomes slow to clone.

## Related

- [DATA.md](DATA.md) — formats and feed modules
- [SYNC_SCRIPTS.md](SYNC_SCRIPTS.md) — sync commands
