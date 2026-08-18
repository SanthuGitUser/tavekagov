"""
Fetch the 43 Tamil Nadu government department names from Wikipedia and enrich them with
minister names using tn.gov.in manifests.

Output:
  TN-GOV_Departments/manifests/tn_wiki_departments_ministers.json

Usage:
  pip install -r requirements.txt
  python tn_wiki_departments_ministers_sync.py
  Optional: python tn_wiki_departments_ministers_sync.py --output-dir path/to/manifests
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

_REPO_ROOT = Path(__file__).resolve().parent.parent
_MANIFESTS_DIR = Path(__file__).resolve().parent / "manifests"
_TN_DEPTS_MANIFEST = _MANIFESTS_DIR / "tn_departments.json"
_MINISTERS_MANIFEST = _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json"
_KOLKATA = ZoneInfo("Asia/Kolkata")

_WIKI_LIST_TITLE = "List_of_departments_of_the_government_of_Tamil_Nadu"
_WIKI_API = "https://en.wikipedia.org/w/api.php"
_DEFAULT_HEADERS = {
    "User-Agent": (
        "tavekagov-sync/1.0 (https://github.com; educational) "
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    )
}

_SECTION_LIST_RE = re.compile(r"^==\s*List\s*==\s*$", re.IGNORECASE)
_SECTION_ANY_RE = re.compile(r"^==\s*[^=].*?==\s*$")
_WIKILINK_RE = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
_PUNCT_RE = re.compile(r"[^a-z0-9\s]")


def _normalize_text(value: str) -> str:
    text = html.unescape(value or "")
    text = text.replace("&", " and ")
    text = text.lower()
    text = _PUNCT_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokenize(value: str) -> set[str]:
    stop = {"department", "of", "the", "government"}
    raw_tokens = [t for t in _normalize_text(value).split(" ") if t and t not in stop]
    synonyms = {
        "dev": "development",
        "ports": "port",
        "classes": "class",
        "resources": "resource",
        "forests": "forest",
        "elections": "election",
        "initiatives": "initiative",
        "endowments": "endowment",
        "enterprises": "enterprise",
        "works": "work",
        "sports": "sport",
        "taxes": "tax",
    }

    tokens: set[str] = set()
    for t in raw_tokens:
        t = synonyms.get(t, t)
        if len(t) > 3 and t.endswith("s"):
            t = t[:-1]
        tokens.add(t)
    return tokens


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a.intersection(b))
    union = len(a.union(b))
    return inter / union if union else 0.0


def _match_score(target: set[str], candidate: set[str]) -> float:
    if not target or not candidate:
        return 0.0
    inter = len(target.intersection(candidate))
    coverage = inter / len(target) if target else 0.0
    jacc = _jaccard(target, candidate)
    return (0.7 * coverage) + (0.3 * jacc)


def _strip_wikilinks(line: str) -> str:
    def repl(match: re.Match[str]) -> str:
        target = (match.group(2) or match.group(1) or "").strip()
        return target

    return _WIKILINK_RE.sub(repl, line)


def fetch_wiki_department_names(session: requests.Session, *, timeout: tuple[float, float]) -> list[str]:
    params = {
        "action": "query",
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
        "formatversion": "2",
        "titles": _WIKI_LIST_TITLE,
    }
    response = session.get(_WIKI_API, params=params, timeout=timeout)
    response.raise_for_status()
    payload = response.json()
    pages = payload.get("query", {}).get("pages", [])
    if not pages:
        raise RuntimeError("Wikipedia API returned no pages.")
    revisions = (pages[0] or {}).get("revisions", [])
    if not revisions:
        raise RuntimeError("Wikipedia API returned no revisions.")
    wikitext = (((revisions[0] or {}).get("slots", {}) or {}).get("main", {}) or {}).get("content", "")
    if not wikitext:
        raise RuntimeError("Wikipedia wikitext was empty.")

    in_list = False
    names: list[str] = []
    for raw in wikitext.splitlines():
        line = raw.strip()
        if _SECTION_LIST_RE.match(line):
            in_list = True
            continue
        if in_list and _SECTION_ANY_RE.match(line) and not _SECTION_LIST_RE.match(line):
            break
        if not in_list:
            continue
        if not line.startswith(("*", "-")):
            continue

        item = line.lstrip("*-").strip()
        item = _strip_wikilinks(item)
        item = re.sub(r"\s+", " ", item).strip()
        if not item:
            continue

        # Some entries are "Department of X" already; keep as-is.
        names.append(item)

    # De-duplicate while preserving order
    seen: set[str] = set()
    out: list[str] = []
    for n in names:
        if n not in seen:
            out.append(n)
            seen.add(n)

    if len(out) != 43:
        raise RuntimeError(f"Expected 43 departments from Wikipedia, got {len(out)}.")
    return out


@dataclass(frozen=True)
class TnDeptRecord:
    name: str
    minister_name: str | None
    profile_url: str | None


def load_tn_dept_manifest() -> list[TnDeptRecord]:
    if not _TN_DEPTS_MANIFEST.exists():
        return []
    payload = json.loads(_TN_DEPTS_MANIFEST.read_text(encoding="utf-8"))
    items = payload.get("departments", []) or []
    out: list[TnDeptRecord] = []
    for item in items:
        out.append(
            TnDeptRecord(
                name=item.get("name", ""),
                minister_name=item.get("minister_name") or None,
                profile_url=item.get("profile_url") or None,
            )
        )
    return out


@dataclass(frozen=True)
class MinisterRecord:
    name: str
    designation: str
    portfolio: str
    is_chief_minister: bool


def load_ministers() -> list[MinisterRecord]:
    if not _MINISTERS_MANIFEST.exists():
        return []
    payload = json.loads(_MINISTERS_MANIFEST.read_text(encoding="utf-8"))
    out: list[MinisterRecord] = []
    for item in payload.get("ministers", []) or []:
        out.append(
            MinisterRecord(
                name=item.get("name", ""),
                designation=item.get("designation", ""),
                portfolio=item.get("portfolio", ""),
                is_chief_minister=bool(item.get("is_chief_minister")),
            )
        )
    return out


def match_minister_from_portfolio(department_name: str, ministers: list[MinisterRecord]) -> str | None:
    normalized = _normalize_text(department_name)
    if ("mudalvarin" in normalized or "mugavari" in normalized) and ministers:
        for m in ministers:
            if m.is_chief_minister:
                return m.name

    dept_tokens = _tokenize(department_name)
    best: tuple[float, str] | None = None
    for m in ministers:
        blob = f"{m.designation} {m.portfolio}"
        score = _match_score(dept_tokens, _tokenize(blob))
        if best is None or score > best[0]:
            best = (score, m.name)
    if not best:
        return None
    return best[1] if best[0] >= 0.45 else None


def best_match_tn_dept(wiki_department_name: str, tn_depts: list[TnDeptRecord]) -> tuple[TnDeptRecord | None, float]:
    target = _tokenize(wiki_department_name)
    best: tuple[float, TnDeptRecord] | None = None
    for d in tn_depts:
        score = _match_score(target, _tokenize(d.name))
        if best is None or score > best[0]:
            best = (score, d)
    if not best:
        return None, 0.0
    if best[0] < 0.45:
        return None, best[0]
    return best[1], best[0]


@dataclass(frozen=True)
class WikiDepartmentMinister:
    department: str
    minister: str | None
    minister_source: str
    department_profile_url: str | None


def build_output(
    wiki_departments: list[str],
    tn_depts: list[TnDeptRecord],
    ministers: list[MinisterRecord],
) -> list[WikiDepartmentMinister]:
    chief_minister = next((m for m in ministers if m.is_chief_minister), None) if ministers else None
    out: list[WikiDepartmentMinister] = []
    for name in wiki_departments:
        match, score = best_match_tn_dept(name, tn_depts)
        if match and match.minister_name:
            out.append(
                WikiDepartmentMinister(
                    department=name,
                    minister=match.minister_name,
                    minister_source="tn.gov.in dept_profile",
                    department_profile_url=match.profile_url,
                )
            )
            continue

        portfolio_minister = match_minister_from_portfolio(name, ministers) if ministers else None
        if portfolio_minister:
            out.append(
                WikiDepartmentMinister(
                    department=name,
                    minister=portfolio_minister,
                    minister_source="tn.gov.in minister_list portfolio",
                    department_profile_url=match.profile_url if match else None,
                )
            )
            continue

        normalized = _normalize_text(name)
        if chief_minister and (
            "miscellaneous officers" in normalized
            or "secretariat" in normalized
            or "other states" in normalized
            or "other state" in normalized
        ):
            out.append(
                WikiDepartmentMinister(
                    department=name,
                    minister=chief_minister.name,
                    minister_source="tn.gov.in minister_list chief minister (assumed)",
                    department_profile_url=match.profile_url if match else None,
                )
            )
            continue

        out.append(
            WikiDepartmentMinister(
                department=name,
                minister=None,
                minister_source="unresolved",
                department_profile_url=match.profile_url if match else None,
            )
        )
    return out


def write_manifest(rows: list[WikiDepartmentMinister], *, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / "tn_wiki_departments_ministers.json"
    payload = {
        "source_url": f"https://en.wikipedia.org/wiki/{_WIKI_LIST_TITLE}",
        "fetchedAt": datetime.now(_KOLKATA).isoformat(),
        "count": len(rows),
        "departments": [asdict(r) for r in rows],
    }
    if str((_REPO_ROOT / "Sync-Config")) not in sys.path:
        sys.path.insert(0, str(_REPO_ROOT / "Sync-Config"))
    from write_utils import write_json_if_changed

    write_json_if_changed(path, payload, volatile_top_level_keys={"fetchedAt"})
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch 43 TN departments from Wikipedia and enrich with minister names.",
    )
    parser.add_argument(
        "--output-dir",
        default=str(_MANIFESTS_DIR),
        help="Folder for tn_wiki_departments_ministers.json (default: manifests/).",
    )
    args = parser.parse_args()

    # Reuse repo retry session if available.
    if str((_REPO_ROOT / "Sync-Config")) not in sys.path:
        sys.path.insert(0, str(_REPO_ROOT / "Sync-Config"))
    try:
        from http_client import DEFAULT_CONNECT_READ_TIMEOUT, build_retry_session

        session = build_retry_session(headers=_DEFAULT_HEADERS)
        timeout = DEFAULT_CONNECT_READ_TIMEOUT
    except Exception:
        session = requests.Session()
        session.headers.update(_DEFAULT_HEADERS)
        timeout = (10.0, 25.0)

    wiki_departments = fetch_wiki_department_names(session, timeout=timeout)
    tn_depts = load_tn_dept_manifest()
    ministers = load_ministers()

    rows = build_output(wiki_departments, tn_depts, ministers)
    manifest_path = write_manifest(rows, output_dir=Path(args.output_dir))
    unresolved = sum(1 for r in rows if not r.minister)
    print(f"Wikipedia departments: {len(wiki_departments)}")
    print(f"Unresolved ministers: {unresolved}")
    print(f"Wrote manifest: {manifest_path}")

    # Record sync in central state if present.
    try:
        from sync_state import record_sync

        record_sync("JOB_WIKI_DEPARTMENTS_MINISTERS")
    except Exception:
        pass

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

