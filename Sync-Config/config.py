import os
from pathlib import Path

from dotenv import load_dotenv

_DEFAULT_TN_GOV_BASE_URL = "https://www.tn.gov.in/"
_DEFAULT_TN_DEPT_SOURCE_URL = "https://www.tn.gov.in/department_list.php"
_DEFAULT_TN_MINISTERS_SOURCE_URL = "https://www.tn.gov.in/minister_list.php"
_DEFAULT_TN_DISTRICTS_SOURCE_URL = "https://www.tn.gov.in/district_list.php"
_DEFAULT_TN_GO_DEPT_SOURCE_URL = "https://www.tn.gov.in/godept_list.php"
_DEFAULT_TN_PRESS_RELEASE_SOURCE_URL = "https://dipr.tn.gov.in/press-release1.html"
_DEFAULT_TN_GOV_PRESS_RELEASE_SOURCE_URL = "https://www.tn.gov.in/press_release.php"
_DEFAULT_TN_DVAC_PRESS_RELEASE_SOURCE_URL = "https://www.dvac.tn.gov.in/Press_Release.html"
_DEFAULT_TN_FINANCE_NOTIFICATIONS_SOURCE_URL = "https://financedept.tn.gov.in/en/"
_DEFAULT_TVA_MAGAZINE_SOURCE_URL = (
    "https://tamildigitallibrary.in/book-search-new"
    "?sub_cat_id=36&cat_id=21&sub_cat_name=%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AE%B0%E0%AE%9A%E0%AF%81"
)
_DEFAULT_TN_IAS_TRANSFERS_POSTINGS_SOURCE_URL = (
    "https://tnsectdemo.tn.gov.in/ias/transferandpostings.php"
)
_DEFAULT_TN_GO_START_DATE = "10-05-2026"
_DEFAULT_TN_DVAC_PRESS_RELEASE_START_DATE = "01-05-2026"

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)


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


def get_tn_dvac_press_release_source_url() -> str:
    return (
        os.getenv("TN_DVAC_PRESS_RELEASE_SOURCE_URL")
        or _DEFAULT_TN_DVAC_PRESS_RELEASE_SOURCE_URL
    ).strip()


def get_tn_dvac_press_release_start_date() -> str:
    return (
        os.getenv("TN_DVAC_PRESS_RELEASE_START_DATE")
        or _DEFAULT_TN_DVAC_PRESS_RELEASE_START_DATE
    ).strip()


def get_tn_finance_notifications_source_url() -> str:
    return (
        os.getenv("TN_FINANCE_NOTIFICATIONS_SOURCE_URL")
        or _DEFAULT_TN_FINANCE_NOTIFICATIONS_SOURCE_URL
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
