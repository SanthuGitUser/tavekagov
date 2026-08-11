"""
Fetch the 'Council of Ministers' table from Wikipedia's 17th Tamil Nadu Assembly page
and write minister names + linked portfolios to a JSON manifest.

Usage:
  1) pip install -r requirements.txt
  2) python tn_ministers_wikipedia_portfolios_sync.py
  3) Optional:
       python tn_ministers_wikipedia_portfolios_sync.py --url "https://en.wikipedia.org/wiki/17th_Tamil_Nadu_Assembly"
       python tn_ministers_wikipedia_portfolios_sync.py --output-path manifests/tn_ministers_wikipedia_portfolios.json
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup, Tag

_KOLKATA = ZoneInfo("Asia/Kolkata")
_DEFAULT_URL = "https://en.wikipedia.org/wiki/17th_Tamil_Nadu_Assembly"
_WIKI_BASE = "https://en.wikipedia.org"
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_DEFAULT_OUTPUT = _MANIFESTS_DIR / "tn_ministers_wikipedia_portfolios.json"

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

_SR_NO_RE = re.compile(r"^\s*(\d+)\s*$")


@dataclass(frozen=True)
class Link:
    name: str
    url: str


@dataclass(frozen=True)
class MinisterPortfolios:
    sr_no: int
    minister_name: str
    minister_url: str | None
    portfolios: list[Link]


def _abs_wiki_url(href: str | None) -> str | None:
    if not href:
        return None
    href = href.strip()
    if not href:
        return None
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("/wiki/") or href.startswith("/w/"):
        return urljoin(_WIKI_BASE, href)
    return urljoin(_WIKI_BASE, href)


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").replace("\xa0", " ")).strip()


def _extract_first_link_text(cell: Tag) -> tuple[str, str | None]:
    a = cell.find("a", href=True)
    if a:
        return _clean_text(a.get_text(" ", strip=True)), _abs_wiki_url(a.get("href"))
    return _clean_text(cell.get_text(" ", strip=True)), None


def _extract_links(cell: Tag) -> list[Link]:
    seen: set[str] = set()
    links: list[Link] = []
    for a in cell.find_all("a", href=True):
        href = _abs_wiki_url(a.get("href"))
        if not href:
            continue
        if not href.startswith(_WIKI_BASE + "/wiki/"):
            continue
        name = _clean_text(a.get_text(" ", strip=True))
        if not name:
            continue
        if href in seen:
            continue
        seen.add(href)
        links.append(Link(name=name, url=href))
    return links


def _find_council_table(soup: BeautifulSoup) -> Tag:
    headline = soup.select_one("#Council_of_Ministers")
    if not headline:
        # Fallback: sometimes the id differs in casing/underscores
        headline = soup.find(id=re.compile(r"^Council[_\s]of[_\s]Ministers$", re.I))
    if not headline:
        raise RuntimeError("Could not locate the 'Council of Ministers' section on the page.")

    if isinstance(headline, Tag) and headline.name in ("h2", "h3"):
        heading = headline
    else:
        heading = headline.find_parent(["h2", "h3"])
    if not heading:
        raise RuntimeError("Found section anchor but could not locate its heading container.")

    # Wikipedia often wraps headings like:
    # <div class="mw-heading mw-heading2"><h2 id="...">...</h2></div>
    node: Tag = heading
    parent = heading.parent
    if isinstance(parent, Tag) and parent.name == "div" and "mw-heading" in (parent.get("class") or []):
        node = parent

    while True:
        node = node.find_next_sibling()
        if node is None:
            break
        if isinstance(node, Tag) and node.name in ("h2", "h3"):
            break
        if isinstance(node, Tag) and node.name == "table" and "wikitable" in (node.get("class") or []):
            return node

    raise RuntimeError("Could not find the wikitable immediately under 'Council of Ministers'.")


def fetch_council_of_ministers(
    session: requests.Session,
    *,
    url: str,
    timeout: tuple[float, float],
) -> list[MinisterPortfolios]:
    response = session.get(url, headers=_DEFAULT_HEADERS, timeout=timeout)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    table = _find_council_table(soup)

    # Try to locate column indices from the header row.
    name_idx = 1
    portfolio_idx = 4
    for tr in table.select("tr"):
        header_cells = tr.find_all(["th", "td"], recursive=False)
        if not header_cells:
            continue
        header_texts = [_clean_text(c.get_text(" ", strip=True)).lower() for c in header_cells]
        if any("sr" in t and "no" in t for t in header_texts) and any("portfolio" in t for t in header_texts):
            try:
                name_idx = header_texts.index("name")
            except ValueError:
                pass
            for i, t in enumerate(header_texts):
                if "portfolio" in t:
                    portfolio_idx = i
                    break
            break

    results: list[MinisterPortfolios] = []
    for tr in table.select("tr"):
        cells = tr.find_all(["th", "td"], recursive=False)
        if not cells:
            continue

        sr_raw = _clean_text(cells[0].get_text(" ", strip=True))
        match = _SR_NO_RE.match(sr_raw)
        if not match:
            continue
        sr_no = int(match.group(1))

        if len(cells) <= max(name_idx, portfolio_idx):
            continue

        minister_name, minister_url = _extract_first_link_text(cells[name_idx])
        portfolios = _extract_links(cells[portfolio_idx])

        results.append(
            MinisterPortfolios(
                sr_no=sr_no,
                minister_name=minister_name,
                minister_url=minister_url,
                portfolios=portfolios,
            )
        )

    if not results:
        raise RuntimeError("No minister rows parsed from the Council of Ministers table.")

    return results


def write_manifest(items: list[MinisterPortfolios], *, source_url: str, output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source_url": source_url,
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(items),
        "ministers": [
            {
                "sr_no": item.sr_no,
                "minister_name": item.minister_name,
                "minister_url": item.minister_url,
                "portfolios": [asdict(link) for link in item.portfolios],
            }
            for item in items
        ],
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return output_path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch Council of Ministers from Wikipedia and write linked portfolios JSON.",
    )
    parser.add_argument("--url", default=_DEFAULT_URL, help="Wikipedia page URL.")
    parser.add_argument(
        "--output-path",
        default=str(_DEFAULT_OUTPUT),
        help="Output JSON path (default: manifests/tn_ministers_wikipedia_portfolios.json).",
    )
    args = parser.parse_args()

    session = requests.Session()
    try:
        items = fetch_council_of_ministers(session, url=args.url, timeout=(10.0, 30.0))
    except requests.RequestException as exc:
        print(f"Request failed: {exc}")
        return 1
    except RuntimeError as exc:
        print(str(exc))
        return 1

    path = write_manifest(items, source_url=args.url, output_path=Path(args.output_path))
    print(f"Parsed {len(items)} ministers.")
    print(f"Wrote manifest: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

