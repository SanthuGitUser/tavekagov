"""Apply only the tn_transfers_postings table DDL."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
create table if not exists public.tn_transfers_postings (
    id bigserial primary key,
    serial_number integer not null,
    go_date date not null,
    go_number text not null,
    subject text not null,
    pdf_url text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists tn_transfers_postings_go_date_idx
    on public.tn_transfers_postings (go_date desc);

create index if not exists tn_transfers_postings_go_number_idx
    on public.tn_transfers_postings (go_number);

drop trigger if exists tn_transfers_postings_set_updated_at on public.tn_transfers_postings;
create trigger tn_transfers_postings_set_updated_at
before update on public.tn_transfers_postings
for each row execute function public.set_updated_at();

alter table public.tn_transfers_postings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tn_transfers_postings'
      and policyname = 'Public read tn transfers postings'
  ) then
    create policy "Public read tn transfers postings"
    on public.tn_transfers_postings for select
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

    print("tn_transfers_postings table ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
