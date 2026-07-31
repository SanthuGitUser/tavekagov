from functools import lru_cache

from supabase import Client, create_client

from config import get_supabase_anon_key, get_supabase_service_role_key, get_supabase_url


@lru_cache(maxsize=1)
def get_supabase_client(*, use_service_role: bool = False) -> Client:
    """
    Return a cached Supabase client.

    use_service_role=False (default): anon key — respects Row Level Security.
    use_service_role=True: service role key — for trusted server scripts (scrapers, migrations).
    """
    url = get_supabase_url()
    key = get_supabase_service_role_key() if use_service_role else get_supabase_anon_key()
    return create_client(url, key)
