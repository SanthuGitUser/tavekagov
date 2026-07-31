"""
Verify Supabase connectivity.

Usage:
  1. Copy .env.example to .env and fill in your API keys.
  2. pip install -r requirements.txt
  3. python test_connection.py
"""

from __future__ import annotations

import sys

from client import get_supabase_client
from config import get_supabase_url


def main() -> int:
    url = get_supabase_url()
    print(f"Supabase URL: {url}")

    try:
        client = get_supabase_client()
    except ValueError as exc:
        print(f"Configuration error: {exc}")
        return 1

    # Lightweight REST health check (works even before tables exist).
    try:
        client.table("tn_press_release").select("id").limit(1).execute()
        print("Connected to Supabase successfully (tn_press_release table is ready).")
        return 0
    except Exception as exc:
        msg = str(exc).lower()
        if "could not find the table" in msg or "pgrst205" in msg:
            print("Connected to Supabase REST API (run apply_schema.py to create tables).")
            return 0
        if "invalid api key" in msg or "jwt" in msg:
            print(f"Authentication failed: check SUPABASE_ANON_KEY in .env")
            return 1
        print(f"Connection check failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
