# TavekaGov Web Dashboard

Modern static dashboard for Tamil Nadu government open data (Path A stack).

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn-style UI components
- TanStack Table
- Recharts
- React Router
- Supabase JS client (public anon key)

## Pages

- Dashboard (KPI cards, activity chart, recent press releases)
- Press releases (searchable table)
- Press release images
- Government orders
- Departments, ministers, districts
- About

## Local development

The web app reads Supabase credentials from **either**:

1. `web/.env.local` (recommended), or
2. `Public DB/.env` (`SUPABASE_URL` / `SUPABASE_ANON_KEY` or `VITE_*` variants — loaded automatically)

```powershell
cd web
copy .env.example .env.local
# Edit .env.local, or ensure Public DB/.env has SUPABASE_URL + SUPABASE_ANON_KEY
npm install
npm run dev
```

Restart `npm run dev` after changing env files. The header badge should say **Live data**, not **Demo mode**.

## Build

```powershell
npm run build
npm run preview
```

For GitHub project pages (repo name `tavekagov`):

```powershell
$env:VITE_BASE_PATH="/tavekagov/"
npm run build
```

## GitHub Pages deploy

A workflow at `.github/workflows/deploy-web.yml` builds and deploys `web/dist` on push to `main`.

Add these GitHub repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Set `VITE_BASE_PATH` in the workflow to `/tavekagov/` for project pages, or `/` for `username.github.io`.

## Security

Only the Supabase **anon** key belongs in this frontend. Never expose the service role key in client code.
