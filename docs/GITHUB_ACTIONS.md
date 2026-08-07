# GitHub Actions

This repository uses GitHub Actions to **build and deploy** the static web dashboard to GitHub Pages.

## Workflows overview

| Workflow | Script(s) | Output paths | Secret |
|----------|-----------|--------------|--------|
| [deploy-web.yml](../.github/workflows/deploy-web.yml) | `npm run build` in `web/` | GitHub Pages (`web/dist`) | — |

## Deploy workflow

[deploy-web.yml](../.github/workflows/deploy-web.yml) builds and deploys the dashboard to GitHub Pages.

**Triggers:**

- **Push to `main`** — rebuilds and deploys when GitHub accepts the push event
- **Manual** — Actions → Deploy Web Dashboard → Run workflow
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

## Fork setup

### 1. Enable GitHub Pages

- Repository **Settings → Pages**
- Source: **GitHub Actions**

### 2. Adjust base path (optional)

If your repo is not named `tavekagov`, update `VITE_BASE_PATH` in:

- `.github/workflows/deploy-web.yml`
- `web/.env.local` for local preview

For a user site (`username.github.io`), use `/` instead of `/tavekagov/`.

### 3. Enable Actions

Ensure **Settings → Actions → General** allows workflow runs on the default branch.

## Permissions

| Workflow | `contents` | Other |
|----------|------------|-------|
| Deploy | `read` | `pages: write`, `id-token: write` |

## Related docs

- [SYNC_SCRIPTS.md](SYNC_SCRIPTS.md)
- [DATA.md](DATA.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
