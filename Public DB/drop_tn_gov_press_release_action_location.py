"""Remove action and location columns from tn_gov_press_releases."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
alter table public.tn_gov_press_releases
    drop column if exists action,
    drop column if exists location;
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

    print("Removed action and location columns from tn_gov_press_releases.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
