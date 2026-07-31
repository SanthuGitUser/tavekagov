"""Apply schema.sql using a direct Postgres connection (DATABASE_URL)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from config import get_database_url

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"


def _split_sql(sql: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    in_dollar_quote = False

    for line in sql.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("--"):
            continue

        if "$$" in line and line.count("$$") % 2 == 1:
            in_dollar_quote = not in_dollar_quote

        current.append(line)
        if not in_dollar_quote and stripped.endswith(";"):
            stmt = "\n".join(current).strip()
            if stmt:
                statements.append(stmt)
            current = []

    tail = "\n".join(current).strip()
    if tail:
        statements.append(tail)
    return statements


def main() -> int:
    database_url = get_database_url()
    if not database_url:
        print(
            "DATABASE_URL is not set in .env.\n"
            "Add it from Supabase > Project Settings > Database > Connection string (URI).\n"
            "Use the transaction pooler URI (port 6543) or direct connection (port 5432)."
        )
        return 1

    try:
        import psycopg2
    except ImportError:
        print("Installing psycopg2-binary...")
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])
        import psycopg2

    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    statements = _split_sql(sql)

    print(f"Applying {len(statements)} SQL statements...")
    with psycopg2.connect(database_url) as conn:
        conn.autocommit = True
        with conn.cursor() as cur:
            for i, stmt in enumerate(statements, start=1):
                preview = re.sub(r"\s+", " ", stmt)[:80]
                print(f"  [{i}/{len(statements)}] {preview}...")
                cur.execute(stmt)

    print("Schema applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
