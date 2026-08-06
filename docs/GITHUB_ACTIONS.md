# GitHub Actions

This repository uses GitHub Actions to **build and deploy** the static web dashboard to GitHub Pages.

## Workflows overview

| Workflow | Script(s) | Output paths | Secret |
|----------|-----------|--------------|--------|
| [deploy-web.yml](../.github/workflows/deploy-web.yml) | `npm run build` in `web/` | GitHub Pages (`web/dist`) | — |

## Deploy workflow

[deploy-web.yml](../.github/workflows/deploy-web.yml) builds and deploys the dashboard to GitHub Pages.

**Triggers on push to `main` when these paths change:**

- `web/**`
- `TN-Map/**`
- `TN-News/**`
- `TN-DIPR-Press Release/**`
- `TN-GOV-Press Release/**`
- `TN-Government Orders/**`
- `TN-IAS_Transfers-Postings/**`
- `TN-TVA-Magazine/**`
- `TN-GOV_Departments/**`
- `TN-GOV_Council Of Ministers/**`
- `TN-GOV_Districts/**`
- `.github/workflows/deploy-web.yml`

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
