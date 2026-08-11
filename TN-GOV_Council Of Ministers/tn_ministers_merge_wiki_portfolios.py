"""
Merge tn.gov.in ministers manifest with Wikipedia-linked portfolios.

Inputs:
  - manifests/tn_ministers.json (from tn_ministers_sync.py; has `portfolio` as text)
  - manifests/tn_ministers_wikipedia_portfolios.json (has portfolio names as list)

Output:
  - manifests/tn_ministers.json (in-place by default)

Resulting schema:
  - replaces `portfolio` (string) with `portfolios` (string[])
  - prefers Wikipedia portfolio list when a minister name match is found
"""

from __future__ import annotations

import argparse
import html
import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any


_HONORIFICS_RE = re.compile(
    r"\b(?:thiru|tmt|selvi|smt|shri|dr|prof|mr|mrs|ms|kumari)\b\.?",
    re.IGNORECASE,
)


def _clean_name(value: str) -> str:
    text = html.unescape(value or "")
    text = text.replace("&nbsp;", " ")
    text = _HONORIFICS_RE.sub(" ", text)
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip().lower()


def _compact_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", _clean_name(value))


def _tokenize(value: str) -> list[str]:
    return [t for t in _clean_name(value).split(" ") if len(t) >= 2]


def _best_wiki_match(official_name: str, wiki_by_compact: dict[str, "WikiEntry"]) -> "WikiEntry | None":
    official_compact = _compact_key(official_name)
    if not official_compact:
        return None

    # Exact/substring match on compact key first.
    for key, entry in wiki_by_compact.items():
        if key == official_compact or key in official_compact or official_compact in key:
            return entry

    # Fuzzy match fallback.
    official_tokens = set(_tokenize(official_name))
    best: tuple[float, WikiEntry] | None = None
    for key, entry in wiki_by_compact.items():
        ratio = SequenceMatcher(None, official_compact, key).ratio()
        if official_tokens:
            common = official_tokens.intersection(entry.tokens)
            token_bonus = sum(len(t) for t in common) / 50.0
        else:
            token_bonus = 0.0
        score = ratio + token_bonus
        if best is None or score > best[0]:
            best = (score, entry)

    if not best:
        return None

    score, entry = best
    return entry if score >= 0.78 else None


def _clean_portfolio_item(value: str) -> str:
    text = html.unescape(value or "").replace("&nbsp;", " ")
    text = re.sub(r"\s+", " ", text).strip()
    text = text.rstrip(" .,:;")
    return text


def _split_commas_outside_parens(value: str) -> list[str]:
    """Split by commas that are not inside parentheses."""
    value = html.unescape(value or "").replace("&nbsp;", " ").strip()
    if not value:
        return []

    parts: list[str] = []
    buff: list[str] = []
    depth = 0
    for ch in value:
        if ch == "(":
            depth += 1
        elif ch == ")" and depth > 0:
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(buff))
            buff = []
        else:
            buff.append(ch)
    if buff:
        parts.append("".join(buff))
    return [p.strip() for p in parts if p.strip()]


@dataclass(frozen=True)
class WikiEntry:
    minister_name: str
    portfolios: list[str]
    tokens: set[str]


def merge_manifests(
    *,
    official_path: Path,
    wiki_path: Path,
    output_path: Path,
) -> dict[str, Any]:
    official = json.loads(official_path.read_text(encoding="utf-8"))
    wiki = json.loads(wiki_path.read_text(encoding="utf-8"))

    wiki_entries = wiki.get("ministers") or []
    wiki_by_compact: dict[str, WikiEntry] = {}
    for item in wiki_entries:
        if not isinstance(item, dict):
            continue
        name = str(item.get("minister_name") or "").strip()
        if not name:
            continue
        raw_ports = item.get("portfolios") or []
        ports: list[str] = []
        for port in raw_ports:
            if isinstance(port, dict):
                ports.append(_clean_portfolio_item(str(port.get("name") or "")))
            else:
                ports.append(_clean_portfolio_item(str(port)))
        ports = [p for p in ports if p]
        entry = WikiEntry(minister_name=name, portfolios=ports, tokens=set(_tokenize(name)))
        wiki_by_compact[_compact_key(name)] = entry

    ministers = official.get("ministers")
    if not isinstance(ministers, list):
        raise RuntimeError("Official manifest has no `ministers` list.")

    unmatched: list[str] = []
    for minister in ministers:
        if not isinstance(minister, dict):
            continue
        official_name = str(minister.get("name") or "")
        wiki_match = _best_wiki_match(official_name, wiki_by_compact)

        portfolios: list[str]
        if wiki_match and wiki_match.portfolios:
            portfolios = wiki_match.portfolios
        else:
            raw = str(minister.get("portfolio") or "")
            parts = _split_commas_outside_parens(raw)
            portfolios = [_clean_portfolio_item(p) for p in parts]
            portfolios = [p for p in portfolios if p]
            if not wiki_match:
                unmatched.append(official_name)

        minister.pop("portfolio", None)
        minister["portfolios"] = portfolios

    official["count"] = len([m for m in ministers if isinstance(m, dict)])
    output_path.write_text(json.dumps(official, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {"unmatched": unmatched, "total": official["count"]}


def main() -> int:
    parser = argparse.ArgumentParser(description="Merge minister portfolios into tn_ministers.json.")
    parser.add_argument(
        "--official",
        default=str(Path(__file__).resolve().parent / "manifests" / "tn_ministers.json"),
        help="Path to official tn_ministers.json (tn.gov.in).",
    )
    parser.add_argument(
        "--wiki",
        default=str(
            Path(__file__).resolve().parent / "manifests" / "tn_ministers_wikipedia_portfolios.json"
        ),
        help="Path to Wikipedia portfolios JSON.",
    )
    parser.add_argument(
        "--output",
        default=str(Path(__file__).resolve().parent / "manifests" / "tn_ministers.json"),
        help="Output path (default overwrites official manifest).",
    )
    args = parser.parse_args()

    result = merge_manifests(
        official_path=Path(args.official),
        wiki_path=Path(args.wiki),
        output_path=Path(args.output),
    )
    unmatched = result["unmatched"]
    if unmatched:
        print(f"Merged with {len(unmatched)} unmatched names (fallback split used).")
    else:
        print("Merged portfolios for all ministers.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

