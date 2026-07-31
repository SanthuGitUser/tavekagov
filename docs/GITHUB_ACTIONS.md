# GitHub Actions

All scheduled fetch workflows run daily at **11:00 PM IST** (17:30 UTC). Each can also be triggered manually from the **Actions** tab (`workflow_dispatch`).

## Workflows overview

| Workflow | Script(s) | Output paths | Secret |
|----------|-----------|--------------|--------|
| [fetch-tn-dipr-press-releases.yml](../.github/workflows/fetch-tn-dipr-press-releases.yml) | `tn_press_release_sync.py` | `TN-DIPR-Press Release/Response JSON/` | — |
| [fetch-tn-gov-manifests.yml](../.github/workflows/fetch-tn-gov-manifests.yml) | `tn_ministers_sync.py`, `tn_dept_sync.py`, `tn_districts_sync.py` | `TN-GOV_*/manifests/*.json` | — |
| [fetch-tn-scraped-data.yml](../.github/workflows/fetch-tn-scraped-data.yml) | `tn_gov_press_release_sync.py`, `tn_go_dept_sync.py`, `tn_transfers_postings_sync.py`, `tn_magazine_sync.py` | `TN-GOV-Press Release/`, `TN-GOV_GO-Departments/`, `TN-IAS_Transfers-Postings/`, `TN-TVA-Magazine/` | — |
| [fetch-tamil-nadu-news.yml](../.github/workflows/fetch-tamil-nadu-news.yml) | `fetch_tamil_nadu_news.py` | `TN-News/Response JSON/` | `NEWSDATA_API_KEY` |
| [deploy-web.yml](../.github/workflows/deploy-web.yml) | `npm run build` in `web/` | GitHub Pages (`web/dist`) | — |

## Date filters in CI

Most daily jobs use **today's date** in Asia/Kolkata:

```bash
TODAY=$(TZ=Asia/Kolkata date +%d-%m-%Y)
```

| Step | Date arguments |
|------|----------------|
| DIPR press releases | `--start-date "$TODAY" --end-date "$TODAY"` |
| Gov PR images | `--start-date "$TODAY" --end-date "$TODAY"` |
| Government orders | `--start-date "$TODAY" --end-date "$TODAY"` |
| Transfers & postings | `--start-date "$TODAY" --end-date "$TODAY"` |
| Tamil Arasu magazine | `--since-date "$TODAY"` (current month issues) |
| Ministers / departments / districts | No date filter (full manifest refresh) |
| News | Implicit — output file named with run date |

## Commit behavior

Fetch workflows commit only when JSON changes:

```
chore: update TN DIPR press releases YYYY-MM-DD
chore: update TN ministers, departments, and districts YYYY-MM-DD
chore: update TN gov scraped data YYYY-MM-DD
chore: update Tamil Nadu news YYYY-MM-DD
```

Commits are pushed to `main` by `github-actions[bot]`.

## Deploy workflow

[deploy-web.yml](../.github/workflows/deploy-web.yml) builds and deploys the dashboard to GitHub Pages.

**Triggers on push to `main` when these paths change:**

- `web/**`
- `TN-News/**`
- `TN-DIPR-Press Release/**`
- `.github/workflows/deploy-web.yml`

**Build settings:**

- Node.js 22
- `VITE_BASE_PATH=/tavekagov/` (project site URL)

**Note:** JSON updates under other folders (G.O.s, PR images, transfers, magazine, manifests) are committed by Actions but **do not** currently trigger redeploy. To refresh the live site after those updates, either push a change under a watched path or run **Deploy Web Dashboard** manually.

## Fork setup

### 1. Enable GitHub Pages

- Repository **Settings → Pages**
- Source: **GitHub Actions**

### 2. Configure secrets

| Secret | Required for |
|--------|--------------|
| `NEWSDATA_API_KEY` | News fetch workflow only |

Add at **Settings → Secrets and variables → Actions**.

### 3. Adjust base path (optional)

If your repo is not named `tavekagov`, update `VITE_BASE_PATH` in:

- `.github/workflows/deploy-web.yml`
- `web/.env.local` for local preview

For a user site (`username.github.io`), use `/` instead of `/tavekagov/`.

### 4. Enable Actions

Ensure **Settings → Actions → General** allows workflow runs on the default branch.

## Permissions

| Workflow | `contents` | Other |
|----------|------------|-------|
| Fetch workflows | `write` (commit JSON) | — |
| Deploy | `read` | `pages: write`, `id-token: write` |

## Related docs

- [SYNC_SCRIPTS.md](SYNC_SCRIPTS.md)
- [DATA.md](DATA.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
