"""Add parsed-name metadata columns for tn_press_release."""

from __future__ import annotations

import psycopg2

from config import get_database_url


DDL = """
alter table public.tn_press_release
    add column if not exists release_type text,
    add column if not exists department_name text,
    add column if not exists topic text,
    add column if not exists department_id bigint references public.tn_dept (id),
    add column if not exists minister_id bigint references public.tn_ministers (id),
    add column if not exists name_parsed boolean not null default false,
    add column if not exists parse_confidence text,
    add column if not exists minister_match_confidence text;

create index if not exists tn_press_release_department_name_idx
    on public.tn_press_release (department_name);

create index if not exists tn_press_release_release_type_idx
    on public.tn_press_release (release_type);

create index if not exists tn_press_release_minister_id_idx
    on public.tn_press_release (minister_id);

create index if not exists tn_press_release_name_parsed_idx
    on public.tn_press_release (name_parsed)
    where name_parsed = false;
"""


def main() -> int:
    database_url = get_database_url()
    if not database_url:
        print("DATABASE_URL / SUPABASE_DB_PASSWORD is not configured.")
        return 1

    with psycopg2.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)

    print("tn_press_release parse-name schema is ready.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
