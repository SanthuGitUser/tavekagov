# Sync-Config

Shared configuration for Python sync scripts in this repository.

See also [docs/SYNC_SCRIPTS.md](../docs/SYNC_SCRIPTS.md) and [docs/DATA.md](../docs/DATA.md).

This folder is **not** a database. It holds:

- `config.py` — source URLs, start dates, and optional API keys loaded from `.env`
- `sync_state.py` — shared last-sync checkpoints in `last-sync.json`
- `daily_json.py` — helpers for writing daily `Response JSON/YYYY-MM-DD.json` files
- `.env.example` — template for local sync settings
- `last-sync.json.example` — empty checkpoint file template

## Setup

```powershell
copy ".env.example" ".env"
```

Edit `.env` to adjust TN portal source URLs, start dates, or `NEWSDATA_API_KEY` for the news fetch script.

Sync scripts add `Sync-Config` to `sys.path` and import `config` (and sometimes `daily_json`).
