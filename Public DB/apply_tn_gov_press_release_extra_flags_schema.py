"""Add extra flag columns to tn_gov_press_releases.

Adds:
  - budget
  - tributes
  - others
"""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
alter table public.tn_gov_press_releases
    add column if not exists budget boolean not null default false,
    add column if not exists tributes boolean not null default false,
    add column if not exists others boolean not null default false;

create index if not exists tn_gov_press_releases_budget_idx
    on public.tn_gov_press_releases (budget)
    where budget = true;

create index if not exists tn_gov_press_releases_tributes_idx
    on public.tn_gov_press_releases (tributes)
    where tributes = true;

create index if not exists tn_gov_press_releases_others_idx
    on public.tn_gov_press_releases (others)
    where others = true;
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

    print("tn_gov_press_releases budget/tributes/others columns ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

