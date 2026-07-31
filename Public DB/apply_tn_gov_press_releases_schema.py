"""Apply only the tn_gov_press_releases table DDL."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
create table if not exists public.tn_gov_press_releases (
    id bigserial primary key,
    image_url text not null unique,
    release_date date not null,
    title text,
    file_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_gov_press_releases_release_date_idx
    on public.tn_gov_press_releases (release_date desc);

drop trigger if exists tn_gov_press_releases_set_updated_at on public.tn_gov_press_releases;
create trigger tn_gov_press_releases_set_updated_at
before update on public.tn_gov_press_releases
for each row execute function public.set_updated_at();

alter table public.tn_gov_press_releases enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tn_gov_press_releases'
      and policyname = 'Public read tn gov press releases'
  ) then
    create policy "Public read tn gov press releases"
    on public.tn_gov_press_releases for select
    to anon, authenticated
    using (true);
  end if;
end $$;
"""


def main() -> int:
    database_url = get_database_url()
    if not database_url:
        print("DATABASE_URL / SUPABASE_DB_PASSWORD is not configured.")
        return 1

    with psycopg2.connect(database_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(DDL)

    print("tn_gov_press_releases table ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
