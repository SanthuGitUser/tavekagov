# Supabase decommission checklist (archived)

> **Note:** This document is archived internal maintenance notes from the Supabase → JSON migration. New contributors do not need Supabase. See [DATA.md](DATA.md) for the current architecture.

The TavekaGov web app no longer uses Supabase. All data is served from JSON files bundled at build time.

Complete these steps in the Supabase dashboard to fully decommission the old project.

## 1. Confirm nothing depends on Supabase

This repository should have **zero** runtime references to Supabase after the static JSON migration. If you forked or deployed elsewhere, search that codebase for `supabase`, `SUPABASE_`, or `VITE_SUPABASE_`.

## 2. Export anything you might need (optional)

If the project still has tables with data you have not migrated to JSON:

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project ref
3. **Database → Backups** or use `pg_dump` before deletion

Most scraped datasets now live under `TN-*/Response JSON/` and `TN-*/manifests/` in git.

## 3. Delete the Supabase project

1. Go to **Project Settings → General**
2. Scroll to **Delete project**
3. Type the project name to confirm

## 4. Remove GitHub secrets (if set)

In your GitHub repo **Settings → Secrets and variables → Actions**, delete:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Any other `SUPABASE_*` secrets used by old workflows.

## 5. Rotate exposed keys (recommended)

If Supabase keys were ever committed or shared, treat them as compromised even after project deletion. No further action is needed once the project is deleted.

## 6. CLI alternative (optional)

If you use the Supabase CLI and are logged in:

```powershell
npx supabase login
npx supabase projects list
npx supabase projects delete --project-ref YOUR_PROJECT_REF
```

The CLI requires a personal access token from https://supabase.com/dashboard/account/tokens
