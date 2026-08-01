"""Shared HTTP session helpers for tn.gov.in scrapers."""

from __future__ import annotations

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# GitHub Actions runners often need longer connect times to reach tn.gov.in.
DEFAULT_CONNECT_READ_TIMEOUT: tuple[float, float] = (45, 120)


def build_retry_session(
    *,
    headers: dict[str, str] | None = None,
    total_retries: int = 5,
    backoff_factor: float = 3.0,
) -> requests.Session:
    session = requests.Session()
    if headers:
        session.headers.update(headers)

    retry = Retry(
        total=total_retries,
        connect=total_retries,
        read=3,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "HEAD"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session
