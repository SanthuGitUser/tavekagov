"""Add inspection flag column to tn_gov_press_releases."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
alter table public.tn_gov_press_releases
    add column if not exists inspection boolean not null default false;

create index if not exists tn_gov_press_releases_inspection_idx
    on public.tn_gov_press_releases (inspection)
    where inspection = true;
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

    print("tn_gov_press_releases inspection column ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

