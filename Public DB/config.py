import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

_DEFAULT_SUPABASE_URL = "https://irspfdxhlirgfxbbfjim.supabase.co"
_DEFAULT_TN_GOV_BASE_URL = "https://www.tn.gov.in/"
_DEFAULT_TN_DEPT_SOURCE_URL = "https://www.tn.gov.in/department_list.php"
_DEFAULT_TN_MINISTERS_SOURCE_URL = "https://www.tn.gov.in/minister_list.php"
_DEFAULT_TN_DISTRICTS_SOURCE_URL = "https://www.tn.gov.in/district_list.php"
_DEFAULT_TN_GO_DEPT_SOURCE_URL = "https://www.tn.gov.in/godept_list.php"
_DEFAULT_TN_PRESS_RELEASE_SOURCE_URL = "https://dipr.tn.gov.in/press-release1.html"
_DEFAULT_TN_GOV_PRESS_RELEASE_SOURCE_URL = "https://www.tn.gov.in/press_release.php"
_DEFAULT_TVA_MAGAZINE_SOURCE_URL = (
    "https://tamildigitallibrary.in/book-search-new"
    "?sub_cat_id=36&cat_id=21&sub_cat_name=%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AE%B0%E0%AE%9A%E0%AF%81"
)
_DEFAULT_TN_IAS_TRANSFERS_POSTINGS_SOURCE_URL = (
    "https://tnsectdemo.tn.gov.in/ias/transferandpostings.php"
)
_DEFAULT_TN_GO_START_DATE = "10-05-2026"

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)


def get_supabase_url() -> str:
    url = (os.getenv("SUPABASE_URL") or _DEFAULT_SUPABASE_URL).strip().rstrip("/")
    if not url:
        raise ValueError("SUPABASE_URL is not set. Copy .env.example to .env and add your project URL.")
    return url


def get_supabase_anon_key() -> str:
    key = (os.getenv("SUPABASE_ANON_KEY") or "").strip()
    if not key:
        raise ValueError(
            "SUPABASE_ANON_KEY is not set. Copy .env.example to .env and add your anon key "
            "from Supabase > Project Settings > API."
        )
    return key


def get_supabase_service_role_key() -> str:
    key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not key:
        raise ValueError(
            "SUPABASE_SERVICE_ROLE_KEY is not set. Copy .env.example to .env and add your "
            "service role key from Supabase > Project Settings > API."
        )
    return key


def get_database_url() -> str | None:
    url = (os.getenv("DATABASE_URL") or "").strip()
    if url:
        return url

    password = (os.getenv("SUPABASE_DB_PASSWORD") or "").strip()
    if not password:
        return None

    ref = _DEFAULT_SUPABASE_URL.removeprefix("https://").removesuffix(".supabase.co")
    encoded_password = quote_plus(password)
    region = (os.getenv("SUPABASE_DB_REGION") or "ap-southeast-1").strip()
    # Use Supavisor pooler (IPv4) instead of db.<ref>.supabase.co (IPv6-only).
    return (
        f"postgresql://postgres.{ref}:{encoded_password}"
        f"@aws-0-{region}.pooler.supabase.com:6543/postgres"
    )


def get_tn_gov_base_url() -> str:
    return (os.getenv("TN_GOV_BASE_URL") or _DEFAULT_TN_GOV_BASE_URL).strip().rstrip("/") + "/"


def get_tn_dept_source_url() -> str:
    return (os.getenv("TN_DEPT_SOURCE_URL") or _DEFAULT_TN_DEPT_SOURCE_URL).strip()


def get_tn_ministers_source_url() -> str:
    return (os.getenv("TN_MINISTERS_SOURCE_URL") or _DEFAULT_TN_MINISTERS_SOURCE_URL).strip()


def get_tn_districts_source_url() -> str:
    return (os.getenv("TN_DISTRICTS_SOURCE_URL") or _DEFAULT_TN_DISTRICTS_SOURCE_URL).strip()


def get_tn_go_dept_source_url() -> str:
    return (os.getenv("TN_GO_DEPT_SOURCE_URL") or _DEFAULT_TN_GO_DEPT_SOURCE_URL).strip()


def get_tn_go_start_date() -> str:
    return (
        os.getenv("TN_GO_START_DATE")
        or os.getenv("TN_GO_TARGET_DATE")
        or _DEFAULT_TN_GO_START_DATE
    ).strip()


def get_tn_press_release_source_url() -> str:
    return (
        os.getenv("TN_PRESS_RELEASE_SOURCE_URL") or _DEFAULT_TN_PRESS_RELEASE_SOURCE_URL
    ).strip()


def get_tn_gov_press_release_source_url() -> str:
    return (
        os.getenv("TN_GOV_PRESS_RELEASE_SOURCE_URL")
        or _DEFAULT_TN_GOV_PRESS_RELEASE_SOURCE_URL
    ).strip()


def get_tn_gov_press_release_start_date() -> str:
    return (
        os.getenv("TN_GOV_PRESS_RELEASE_START_DATE")
        or os.getenv("TN_GO_START_DATE")
        or os.getenv("TN_GO_TARGET_DATE")
        or _DEFAULT_TN_GO_START_DATE
    ).strip()


def get_tn_press_release_start_date() -> str:
    return (
        os.getenv("TN_PRESS_RELEASE_START_DATE")
        or os.getenv("TN_GO_START_DATE")
        or os.getenv("TN_GO_TARGET_DATE")
        or _DEFAULT_TN_GO_START_DATE
    ).strip()


def get_tva_magazine_source_url() -> str:
    return (os.getenv("TVA_MAGAZINE_SOURCE_URL") or _DEFAULT_TVA_MAGAZINE_SOURCE_URL).strip()


def get_tn_ias_transfers_postings_source_url() -> str:
    return (
        os.getenv("TN_IAS_TRANSFERS_POSTINGS_SOURCE_URL")
        or _DEFAULT_TN_IAS_TRANSFERS_POSTINGS_SOURCE_URL
    ).strip()


def get_tn_ias_transfers_postings_start_date() -> str:
    return (
        os.getenv("TN_IAS_TRANSFERS_POSTINGS_START_DATE")
        or os.getenv("TN_GO_START_DATE")
        or os.getenv("TN_GO_TARGET_DATE")
        or _DEFAULT_TN_GO_START_DATE
    ).strip()


def get_newsdata_api_key() -> str:
    key = (os.getenv("NEWSDATA_API_KEY") or "").strip()
    if not key:
        raise ValueError(
            "NEWSDATA_API_KEY is not set. Copy .env.example to .env and add your API key "
            "from https://newsdata.io/register"
        )
    return key
