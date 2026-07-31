# Contributing to TavekaGov

Thank you for your interest in contributing. This project combines Python data sync scripts with a static React dashboard.

## Before you start

- Read the [README](README.md) and [docs/DISCLAIMER.md](docs/DISCLAIMER.md).
- Review [docs/DATA.md](docs/DATA.md) for JSON formats and [docs/SYNC_SCRIPTS.md](docs/SYNC_SCRIPTS.md) for script usage.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

### Prerequisites

- **Node.js 22+**
- **Python 3.12+**
- **Git**

### Web dashboard

```powershell
cd web
copy .env.example .env.local
npm install
npm run dev
```

See [web/README.md](web/README.md) for build and preview commands.

### Sync scripts

```powershell
copy "Sync-Config\.env.example" "Sync-Config\.env"
cd TN-GOV_Departments
python -m pip install -r requirements.txt
python tn_dept_sync.py
```

For news fetch, add `NEWSDATA_API_KEY` to `Sync-Config/.env`.

## What to contribute

- **Bug fixes** — parsing errors, UI issues, broken links
- **New filters or views** — dashboard improvements
- **Sync reliability** — handling source HTML/API changes
- **Documentation** — clarifications, examples, translations
- **Data corrections** — if official sources change structure

## Pull request guidelines

1. **Branch** from `main` with a descriptive name (`fix/go-date-parse`, `docs/sync-scripts`).
2. **Keep scope focused** — one logical change per PR when possible.
3. **Do not commit secrets** — never include `.env`, `.env.local`, or API keys.
4. **Test locally:**
   - `npm run build` in `web/` for frontend changes
   - Run affected sync script for Python changes
5. **JSON data commits** — if your PR includes scraped JSON, mention the date range and source in the PR description.
6. **Commit messages** — use clear prefixes:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `chore:` data updates, tooling

## JSON and git

Daily JSON files under `TN-*/Response JSON/` are **expected** in this repository. GitHub Actions also commits them automatically. When reviewing PRs:

- Prefer smaller, date-scoped JSON updates over huge unrelated backfills
- Ensure API keys in news JSON are redacted (`<redacted>`)

## Reporting issues

Use GitHub Issues for:

- Missing or incorrect data (include official source URL and date)
- Sync script failures (include command and error output)
- UI bugs (include browser and steps to reproduce)

For security concerns, see [SECURITY.md](SECURITY.md).

## Code style

- **Python** — match existing script style; type hints where already used
- **TypeScript/React** — follow patterns in `web/src/` (functional components, existing feed modules)
- **No drive-by refactors** — avoid unrelated formatting or renames

## Automated workflows

If you fork the repo, see [docs/GITHUB_ACTIONS.md](docs/GITHUB_ACTIONS.md) for secrets and Pages setup.

## Questions

Open a GitHub Issue with the `question` label if something is unclear. We will update the docs when answers benefit everyone.
