"""Drop the deprecated photo_gallery table."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DDL = """
drop table if exists public.photo_gallery cascade;
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

    print("photo_gallery table dropped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
