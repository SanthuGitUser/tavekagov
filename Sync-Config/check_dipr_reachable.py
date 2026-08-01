"""
Quick connectivity check for dipr.tn.gov.in.

Used by GitHub Actions before running DIPR scrapers so unreachable hosts
fail in ~15s instead of retrying for several minutes.

Exit 0 when the portal responds; exit 1 with remediation hints otherwise.
"""

from __future__ import annotations

import sys
from pathlib import Path

import requests

_SYNC_CONFIG = Path(__file__).resolve().parent
if str(_SYNC_CONFIG) not in sys.path:
    sys.path.insert(0, str(_SYNC_CONFIG))

from config import get_tn_press_release_source_url

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
}
_PREFLIGHT_TIMEOUT = (15, 30)


def main() -> int:
    source_url = get_tn_press_release_source_url()
    session = requests.Session()
    session.headers.update(_DEFAULT_HEADERS)

    try:
        response = session.get(source_url, timeout=_PREFLIGHT_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException as exc:
        print(f"dipr.tn.gov.in is not reachable from this runner: {exc}", file=sys.stderr)
        print(file=sys.stderr)
        print("GitHub-hosted runners are often blocked by dipr.tn.gov.in.", file=sys.stderr)
        print("Options:", file=sys.stderr)
        print(
            "  1. Add a self-hosted runner in India and set repository variable "
            "TN_GOV_RUNNER (e.g. self-hosted).",
            file=sys.stderr,
        )
        print(
            "  2. Set repository secret TN_GOV_HTTPS_PROXY to an Indian HTTPS proxy.",
            file=sys.stderr,
        )
        print("  3. Run the scrapers locally and commit the JSON.", file=sys.stderr)
        return 1

    print(f"dipr.tn.gov.in is reachable (HTTP {response.status_code}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
