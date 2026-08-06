# GitHub Actions

This repository uses GitHub Actions to **build and deploy** the static web dashboard to GitHub Pages.

## Workflows overview

| Workflow | Script(s) | Output paths | Secret |
|----------|-----------|--------------|--------|
| [deploy-web.yml](../.github/workflows/deploy-web.yml) | `npm run build` in `web/` | GitHub Pages (`web/dist`) | — |

## Deploy workflow

[deploy-web.yml](../.github/workflows/deploy-web.yml) builds and deploys the dashboard to GitHub Pages.

**Triggers:**

- **Push to `main`** — rebuilds and deploys (any file change)
- **Manual** — Actions → Deploy Web Dashboard → Run workflow

> **Note:** Pushes made by another GitHub Action using the default `GITHUB_TOKEN` do **not** trigger this workflow (GitHub prevents recursive runs). After an automated data sync commit, run the deploy workflow manually, or push from your local machine with your own Git credentials.

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
