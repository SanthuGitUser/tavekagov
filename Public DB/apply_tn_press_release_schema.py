"""Apply only the tn_press_release table DDL."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
create table if not exists public.tn_press_release (
    id bigint primary key,
    name text not null,
    pr_date date not null,
    dipr_pr_no text,
    pdf_url text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_press_release_pr_date_idx on public.tn_press_release (pr_date desc);
create index if not exists tn_press_release_dipr_pr_no_idx on public.tn_press_release (dipr_pr_no);

drop trigger if exists tn_press_release_set_updated_at on public.tn_press_release;
create trigger tn_press_release_set_updated_at
before update on public.tn_press_release
for each row execute function public.set_updated_at();

alter table public.tn_press_release enable row level security;
"""

POLICY = """
do $policy$
begin
  create policy "Public read tn press release"
  on public.tn_press_release for select
  to anon, authenticated
  using (true);
exception
  when duplicate_object then null;
end
$policy$;
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
            cur.execute(POLICY)

    print("tn_press_release table ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
