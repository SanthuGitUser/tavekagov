# GitHub Actions

This repository uses GitHub Actions to **test**, **sync data**, **build**, and **deploy** the static web dashboard to GitHub Pages.

## Workflows overview

| Workflow | Purpose | Secret |
|----------|---------|--------|
| [ci-web.yml](../.github/workflows/ci-web.yml) | `npm run lint`, `npm run test`, `npm run build` | — |
| [ci-sync.yml](../.github/workflows/ci-sync.yml) | Compile every scraper, parse-check PowerShell, Python tests + committed-data checks | — |
| [deploy-web.yml](../.github/workflows/deploy-web.yml) | Build `web/dist` and deploy GitHub Pages | — |

## Deploy workflow

[deploy-web.yml](../.github/workflows/deploy-web.yml) builds and deploys the dashboard to GitHub Pages.

**Triggers:**

- **Push to `main`** — when GitHub accepts the push event
- **Manual** — Actions → Deploy Web Dashboard → Run workflow
- **`repository_dispatch`** — event type `deploy-web` (e.g. from `scripts/trigger-deploy.ps1` or another automation)
- **CLI** — `pwsh scripts/trigger-deploy.ps1` (requires [GitHub CLI](https://cli.github.com/) and `gh auth login`)

### Push did not start a deploy?

GitHub **does not run workflows on `push`** when the commit was pushed with certain tokens (including the default `GITHUB_TOKEN` from another Action, and **pushes from Cursor**). Billing is not the issue — your minutes are unused.

After committing from Cursor, deploy with either:

```powershell
pwsh scripts/trigger-deploy.ps1
```

or **Actions → Deploy Web Dashboard → Run workflow** on branch `main`.

Pushes from an external terminal with SSH or a personal access token usually auto-trigger deploy on `main`.

**Build settings:**

- Node.js 22
- `VITE_BASE_PATH=/tavekagov/` (project site URL)

## Data sync (manual, no workflow)

There is **no scheduled sync workflow**. Tamil Nadu government portals block GitHub-hosted runners, and the workarounds (a self-hosted runner in India or a paid proxy) cost money. Data is refreshed locally:

```powershell
.\scripts\sync-all.ps1      # pulls latest, syncs up to today, archives old daily files
git add -A
git commit -m "chore: sync data through <date>"
git push                     # triggers deploy-web.yml
```

If the push does not start a deploy, run `pwsh scripts/trigger-deploy.ps1` (see above).

## CI (web)

[ci-web.yml](../.github/workflows/ci-web.yml) runs on pushes and PRs that touch `web/` or the data folders it bundles (`TN-*/`, `Sync-Config/*.json`). It runs oxlint, Vitest, and production build with `VITE_BASE_PATH=/tavekagov/`.

## Fork setup

### 1. Enable GitHub Pages

- Repository **Settings → Pages**
- Source: **GitHub Actions**

### 2. Adjust base path (optional)

If your repo is not named `tavekagov`, run:

```powershell
pwsh scripts/configure-fork.ps1 -RepoName your-repo-name
```

Or set `VITE_BASE_PATH` manually in:

- `.github/workflows/deploy-web.yml`
- `.github/workflows/ci-web.yml`
- `web/.env.local` for local preview

For a user site (`username.github.io`), use `/` instead of `/tavekagov/`.

### 3. Enable Actions

Ensure **Settings → Actions → General** allows workflow runs on the default branch.

## Permissions

| Workflow | `contents` | Other |
|----------|------------|-------|
| CI Web | `read` | — |
| CI Sync | `read` | — |
| Deploy | `read` | `pages: write`, `id-token: write` |

## Related docs

- [SYNC_SCRIPTS.md](SYNC_SCRIPTS.md)
- [DATA.md](DATA.md)
- [DATA_RETENTION.md](DATA_RETENTION.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
