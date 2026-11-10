# Project review and improvement log

A record of the project-wide review (SWOT and gap analysis), what was changed because of it, and what is still open. Update the **Status** and **Open items** sections as work lands.

- Review date: 10 November 2026
- Scope: data sync scripts (`Sync-Config/`, `TN-*/`), web dashboard (`web/`), GitHub workflows, docs

---

## 1. Original review (10 Nov 2026)

### Headline finding

The nightly data sync had been failing silently since at least 5 November. The scheduled workflow committed every night, but the commits only touched health metadata (`last-sync.json`, `data-version.json`), never new data.

Cause: the workflow ran `sync-all.ps1 -SkipInstall` on a fresh GitHub runner. With no `.venv`, the script stopped immediately, `continue-on-error: true` hid the failure, and `sync_health.py` then marked feeds stale and committed that.

### Strengths

- **Wide coverage.** About 16 sources in one place: DIPR, DVAC, government orders, IAS transfers, finance, ministers, districts, constituencies, Form 20 election results, schemes, news, magazine, maps.
- **Simple, cheap design.** Scrapers write JSON into git and a static React site is deployed to GitHub Pages. No database or server, near-zero running cost, full data history in git.
- **Solid shared helpers.** Retry HTTP session, write-only-if-changed (no pointless diffs), resume checkpoints in `last-sync.json`, health report.
- **Modern frontend.** React 19, Vite 8, Tailwind 4, lazy-loaded pages, MiniSearch, d3 maps, offline (PWA) support.
- **Good documentation.** README, DATA, SYNC_SCRIPTS, GITHUB_ACTIONS, disclaimer, contributing guide, code of conduct, security policy, issue templates.

### Weaknesses

- **Silent failures.** The sync bug above, plus `try/catch` blocks in `sync-all.ps1` that swallowed scraper errors.
- **Huge bundle.** `dist` was 28 MB across 770 files. The round-wise election JSON became one 10.4 MB JS chunk; the Constituencies page was 920 KB and the main bundle 670 KB.
- **Offline-cache bug.** The service worker tried to precache every JS file (up to 12 MB each, ~27 MB on a first visit), and its navigation fallback pointed at `/index.html` instead of the `/tavekagov/` base, which likely broke offline navigation or the install.
- **Very few tests.** One 13-line Python test for ~10,000 lines of scrapers; 2 web test files (5 tests) for ~7,400 lines of pages and feed code; no parser fixture tests.
- **Repeated code.** 15+ near-identical feed modules and search/view context providers; four copy-pasted `check_*_reachable.py` scripts.
- **Heavy, unpinned dependencies.** IAS transfer PDF parsing needs PaddleOCR (always skipped in CI); 15 separate `requirements.txt` files with no versions pinned.
- **Folder names with spaces** (`TN-GOV_Council Of Ministers`, `TN-DIPR-Press Release`, `Response JSON`) made scripts fragile.

### Opportunities

- **Publish the data as an open API or dataset:** stable JSON endpoints, CSV exports, RSS per source, or a Kaggle/HuggingFace dataset.
- **Cross-linking:** G.O.s ↔ departments ↔ ministers, press releases ↔ districts, MLAs ↔ constituency results.
- **Alerts:** "new G.O. from department X" by RSS, email or Telegram.
- **Full Tamil support:** the language toggle covered only ~15 labels.
- **Search engines and sharing:** no meta descriptions, Open Graph tags or sitemap.

### Threats

- **Source sites change** without notice and parsers break silently.
- **Legal / terms-of-use risk:** browser impersonation (`curl_cffi`) in the election importers; government PDFs re-hosted in the repo (the 11 MB Citizen Budget among them).
- **Neutrality:** a dedicated page for one party's manifesto (TVK) can make a "government open data" site look partisan.
- **Repo growth:** daily files plus election and PDF data grow without limit; GitHub Pages caps sites at 1 GB.
- **Single maintainer:** 49 of 60 commits from one person.

### Gaps identified

1. No alert when a feed fails or goes stale.
2. No schema validation beyond two fields (`fetchedAt`, `count`).
3. CI didn't lint, type-check or test the scrapers.
4. Data built into the app, so every data change needs a full rebuild.
5. No accessibility or performance checks (Lighthouse/axe) in CI.
6. Data retention policy documented but not automated.

---

## 2. Decisions taken

| Topic | Decision | Why |
|-------|----------|-----|
| Data sync | **Manual and local.** The scheduled GitHub workflow was removed. Run `scripts/sync-all.ps1`, review, commit and push from your machine. | TN government portals block GitHub-hosted runners; a self-hosted runner in India or a paid proxy costs money. |
| Re-hosted PDFs | **Link to source sites only.** Finance PDFs removed from the repo; the sync no longer downloads them. | Avoids redistributing government documents; shrinks the repo by ~15 MB. |
| Manifestos | **Keep only the TVK manifesto.** | Maintainer's choice of scope. |
| Tamil translation | **English only.** The language toggle and Tamil labels were removed. | Partial translation (15 labels) gave an inconsistent experience. |

---

## 3. Changes made

### Round 1 — sync reliability, website fixes, CI

**Sync**
- `sync-all.ps1` runs every scraper even if one fails, then lists the failures (`-FailOnError` exits 1). Python output is no longer swallowed.
- `sync_health.py`: `--fail-on-stale`; DVAC and IAS (irregular publishers) are judged by the scraper's last successful run, with a 14-day window; `data-version.json` only changes when feed health changes.
- Fixed a job key saved as the literal text `"JOB_WIKI_DEPARTMENTS_MINISTERS"` (now `wiki_departments_ministers`).
- The four `check_*_reachable.py` scripts were merged into `Sync-Config/check_reachable.py` (handles the IAS site's broken TLS chain like its scraper does).
- `requirements-sync.txt`: pinned dependency set used by CI.

**Website**
- Offline cache: fallback fixed to `index.html` (relative to `/tavekagov/`); only the app shell is precached (~4.4 MB instead of up to ~27 MB); data is cached when first used.
- Election data: the 11.5 MB round-wise file is fetched on demand by the Election Results page only. The dashboard uses a 518 KB final-round copy built by `TN-Election-Results/build_final_round_results.py`; a test checks both give identical results.
- Deep links: refreshing or sharing e.g. `/tavekagov/news` now opens that page (the saved path from `404.html` is restored).
- Government Orders page crash fixed: a hook ran after an early return, so going from some search results to none crashed the page. This was also failing lint.
- Open Graph / Twitter meta tags for link previews.

**CI**
- `ci-sync.yml`: compiles every Python script, parse-checks PowerShell, runs Python tests plus checks on all committed JSON, and verifies the election final-round copy is current.
- `ci-web.yml` also runs when data folders change, since the build bundles them.
- Tests: Python 1 → 1,055; web 5 → 17.

### Round 2 — manual sync, PDFs, refactor, renames, retention

- **Nightly workflow removed** (`.github/workflows/sync-data.yml`). `sync-all.ps1` now runs `git pull --ff-only` first (skipped with a warning when you have local changes; `-NoPull` to skip) and no longer stages its own code files when used with `-Stage`/`-Commit`.
- **PDFs:** `TN-Finance-Notifications/PDFs/` removed and git-ignored; the finance sync only records titles and source links; the UI's "Saved" marker removed.
- **Folder renames** (spaces → hyphens, history kept with `git mv`):

  | Before | After |
  |--------|-------|
  | `TN-DIPR-Press Release` | `TN-DIPR-Press-Release` |
  | `TN-GOV-Press Release` | `TN-GOV-Press-Release` |
  | `TN-DVAC-Press Release` | `TN-DVAC-Press-Release` |
  | `TN-Government Orders` | `TN-Government-Orders` |
  | `TN-GOV_Council Of Ministers` | `TN-GOV_Council-Of-Ministers` |
  | `*/Response JSON` | `*/Response-JSON` |

  All scripts, web imports and docs updated.
- **Data retention automated:** `Sync-Config/data_retention.py` moves daily files older than N months (default 12, `DATA_RETENTION_MONTHS` in `.env`) to `<feed>/archive/YYYY/`. Runs on every `sync-all.ps1` (`-SkipRetention` to skip). With data starting May 2026, nothing is archived until mid-2027.
- **Shared code:**
  - `web/src/lib/lazyDailyJsonFeed.ts` → `createLazyFeed()`: the load-once cache used by the six daily feeds (DIPR, tn.gov.in press releases, DVAC, IAS transfers, G.O.s, magazine). Bonus fix: a failed load is no longer cached forever, so pages can retry.
  - `web/src/context/createStateContext.tsx`: one factory replacing eight hand-written providers (DVAC, G.O. search and view, transfers, DIPR and tn.gov.in press-release views, MLA, constituencies). Consumer code unchanged.

### Round 3 — English-only interface

- Removed the English/தமிழ் toggle from the top navigation, the `LocaleContext` provider and the Tamil labels. `web/src/i18n/messages.ts` is now a plain English label list (`t(key)`), used by the navigation and search page.

---

## 4. Open items

### Sync automation alternatives (for discussion)

Manual sync works but depends on someone remembering to run it. Free or cheap options, all running from an Indian IP:

1. **Windows Task Scheduler on your PC** (free, simplest): run `scripts\sync-all.ps1 -Push` nightly. Only runs while the PC is on.
2. **Self-hosted GitHub runner on your PC** (free; self-hosted runners use no paid minutes): restores a workflow and run history, but the PC must be on and it's more setup than option 1.
3. **Always-free cloud VM in an Indian region** (e.g. Oracle Cloud's Mumbai/Hyderabad regions) with a cron job: always on, but cloud IPs may also be blocked, so test with `check_reachable.py` first.

### Other backlog

- Fixture tests for each parser (saved HTML page → expected JSON).
- Per-feed JSON Schemas (only `manifest-base.schema.json` exists).
- Constituencies page (920 KB, mostly GeoJSON) and main bundle (670 KB) could be split further.
- Lighthouse/axe checks in CI.
- Open data exports (CSV/RSS), cross-entity links, alerts.
- Decide on `curl_cffi` browser impersonation in the election importers.
