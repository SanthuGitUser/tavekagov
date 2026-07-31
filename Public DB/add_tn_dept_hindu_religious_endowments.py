"""Add Hindu Religious and Charitable Endowments to tn_dept."""

from __future__ import annotations

import psycopg2

from config import get_database_url

DEPARTMENT = {
    "id": 46,
    "name": "Hindu Religious and Charitable Endowments",
    "dep_id_encoded": "NDY=",
    "minister_name": "Thiru Ramesh",
    "display_order": 42,
}

UPSERT_SQL = """
insert into public.tn_dept (id, name, dep_id_encoded, minister_name, display_order)
values (%(id)s, %(name)s, %(dep_id_encoded)s, %(minister_name)s, %(display_order)s)
on conflict (id) do update
set name = excluded.name,
    dep_id_encoded = excluded.dep_id_encoded,
    minister_name = excluded.minister_name,
    display_order = excluded.display_order,
    updated_at = now();
"""


def main() -> int:
    database_url = get_database_url()
    if not database_url:
        print("DATABASE_URL / SUPABASE_DB_PASSWORD is not configured.")
        return 1

    with psycopg2.connect(database_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(UPSERT_SQL, DEPARTMENT)
            cur.execute(
                "select id, name, minister_name from public.tn_dept where id = %s",
                (DEPARTMENT["id"],),
            )
            row = cur.fetchone()

    print(f"tn_dept ready: id={row[0]}, name={row[1]}, minister_name={row[2]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
