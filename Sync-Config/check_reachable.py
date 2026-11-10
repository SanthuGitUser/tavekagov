"""
Quick connectivity check for the source portals the scrapers depend on.

Runs in ~15s per host instead of letting scrapers retry for minutes, and tells you
which portals block the current machine (TN government sites block many cloud and
non-Indian IP addresses).

  python Sync-Config/check_reachable.py            # all portals
  python Sync-Config/check_reachable.py dipr ias   # selected portals

Exit 0 when every checked portal responds; exit 1 with remediation hints otherwise.
Honours HTTPS_PROXY, so it also verifies a configured proxy works.
"""

from __future__ import annotations

import argparse
import sys
from collections.abc import Callable
from pathlib import Path

import requests
import urllib3

_SYNC_CONFIG = Path(__file__).resolve().parent
if str(_SYNC_CONFIG) not in sys.path:
    sys.path.insert(0, str(_SYNC_CONFIG))

from config import (  # noqa: E402
    get_tn_gov_base_url,
    get_tn_ias_transfers_postings_source_url,
    get_tn_press_release_source_url,
    get_tva_magazine_source_url,
)

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}
_PREFLIGHT_TIMEOUT = (15, 30)

# name -> (label, url getter, verify TLS). The IAS portal serves an incomplete
# certificate chain, so its scraper (and this check) skip verification.
TARGETS: dict[str, tuple[str, Callable[[], str], bool]] = {
    "dipr": ("dipr.tn.gov.in (DIPR press releases)", get_tn_press_release_source_url, True),
    "tn-gov": ("www.tn.gov.in (orders, departments, ministers, districts)", get_tn_gov_base_url, True),
    "ias": (
        "tnsectdemo.tn.gov.in (IAS transfers & postings)",
        get_tn_ias_transfers_postings_source_url,
        False,
    ),
    "magazine": ("tamildigitallibrary.in (Tamil Arasu magazine)", get_tva_magazine_source_url, True),
}


def check(session: requests.Session, label: str, url: str, verify: bool) -> bool:
    try:
        response = session.get(url, timeout=_PREFLIGHT_TIMEOUT, verify=verify)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"UNREACHABLE  {label}: {exc}", file=sys.stderr)
        return False
    print(f"ok           {label} (HTTP {response.status_code})")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Check source portals are reachable")
    parser.add_argument(
        "targets",
        nargs="*",
        metavar="TARGET",
        help=f"Portals to check (default: all). Choices: {', '.join(TARGETS)}",
    )
    args = parser.parse_args()
    unknown = [name for name in args.targets if name not in TARGETS]
    if unknown:
        parser.error(f"unknown target(s): {', '.join(unknown)}")

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)

    names = args.targets or list(TARGETS)
    failed = [name for name in names if not check(session, TARGETS[name][0], TARGETS[name][1](), TARGETS[name][2])]
    if not failed:
        return 0

    print(file=sys.stderr)
    print("Check your internet connection or VPN, then retry. Tamil Nadu government", file=sys.stderr)
    print("portals also block many non-Indian / cloud IP addresses.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
