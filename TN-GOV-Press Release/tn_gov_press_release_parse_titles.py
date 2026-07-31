"""
Parse gov press release titles into minister and department enrichment fields.

Used by tn_gov_press_release_sync.py during JSON export. Optional CLI audits
enrichment coverage across Response JSON files.

Usage:
  python tn_gov_press_release_parse_titles.py
  python tn_gov_press_release_parse_titles.py --verbose
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from difflib import get_close_matches
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent

_NORMALIZE_TEXT_RE = re.compile(r"[^a-z0-9]+")
_APOSTROPHE_RE = re.compile(r"[`’]")
_HONBLE_RE = re.compile(r"hon'?ble", flags=re.IGNORECASE)

_MINISTER_FOR_RE = re.compile(
    r"hon'?ble\s+minister(?:s)?\s+for\s+(.+?)"
    r"(?=\s+(?:inspected|chaired|inaugurated|participated|conducted|distributed|visited|informed|called|provided|held|joined|extended|was extended|and held|and addressed)\b"
    r"|\s+and\s+hon'?ble\s+|$)",
    flags=re.IGNORECASE,
)
_CHAIRMANSHIP_RE = re.compile(
    r"under the chairmanship of the hon'?ble minister(?:s)?\s+for\s+(.+?)(?:\s+on\b|\s*\.|$)",
    flags=re.IGNORECASE,
)
_CALLED_ON_MINISTER_RE = re.compile(
    r"called on the hon'?ble minister(?:s)?\s+for\s+(.+?)(?:\s*\.|$)",
    flags=re.IGNORECASE,
)
_CM_ACTOR_RE = re.compile(
    r"(?:^|[,.]\s*)(?:as per the orders of )?the hon'?ble chief minister\b",
    flags=re.IGNORECASE,
)
_CM_SUBJECT_RE = re.compile(r"hon'?ble chief minister\b", flags=re.IGNORECASE)
_MINISTERS_PLURAL_RE = re.compile(r"hon'?ble ministers\b", flags=re.IGNORECASE)
_IAS_RE = re.compile(r"\bias\b", flags=re.IGNORECASE)
_MINISTER_PERSON_RE = re.compile(
    r"hon'?ble\s+minister\s+(thiru|tmt)\s+(.+?)(?=\s+(?:inspected|chaired|inaugurated|released|flagged|met|paid|distributed|conducted|visited|travelled|felicitated|witnessed|welcomed|reviewed)\b)",
    flags=re.IGNORECASE,
)


@dataclass(frozen=True)
class MinisterRow:
    id: int
    name: str
    designation: str
    portfolio: str | None
    is_chief_minister: bool


@dataclass(frozen=True)
class DepartmentRow:
    id: int
    name: str
    minister_name: str | None


@dataclass(frozen=True)
class ParsedTitle:
    minister_name: str | None
    department_name: str | None
    is_chief_minister: bool
    confidence: str


def _chief_minister(ministers: list[MinisterRow]) -> MinisterRow | None:
    return next((minister for minister in ministers if minister.is_chief_minister), None)


def _is_posting_title(title: str | None) -> bool:
    if not title:
        return False

    lowered = _normalize_text(title)
    if not _IAS_RE.search(lowered):
        return False

    posting_signals = (
        "joined duty",
        "assumed charge",
        "posted as",
        "posting",
        "transfer",
        "collector of",
        "director of",
        "takes charge",
        "took charge",
        "relieved from",
        "appointed as",
    )
    if not any(signal in lowered for signal in posting_signals):
        return False

    if _CM_SUBJECT_RE.search(title) and re.search(
        r"called on|chaired|inaugurated|inspected|extended warm|paid floral|speech delivered|flagged off",
        lowered,
    ):
        return False

    return True


def _is_review_meeting_title(title: str | None) -> bool:
    if not title:
        return False
    return "review meeting" in _normalize_text(title)


def _is_budget_title(title: str | None) -> bool:
    if not title:
        return False
    lowered = _normalize_text(title)
    if "budget" not in lowered:
        return False
    return any(key in lowered for key in ("pre budget", "prebudget", "discussion", "consultation"))


def _is_tributes_title(title: str | None) -> bool:
    if not title:
        return False
    lowered = _normalize_text(title)
    return "floral tribute" in lowered or "floral tributes" in lowered


def _is_others_title(title: str | None) -> bool:
    if not title:
        return False
    lowered = _normalize_text(title)
    if "plastic bag free day" in lowered:
        return True
    if "presented awards" in lowered and "state level" in lowered:
        return True
    if "public awareness" in lowered and "observed" in lowered:
        return True
    return False


def _is_inspection_title(title: str | None) -> bool:
    if not title:
        return False
    return "inspection" in _normalize_text(title)


def _is_cm_visit_title(title: str | None) -> bool:
    if not title:
        return False

    normalized = _normalize_title(title)
    if not _CM_SUBJECT_RE.search(normalized):
        return False
    if _MINISTERS_PLURAL_RE.search(normalized):
        return False
    if _MINISTER_FOR_RE.search(normalized):
        return False
    if _CHAIRMANSHIP_RE.search(normalized):
        return False
    if _CALLED_ON_MINISTER_RE.search(normalized):
        return False
    return True


def _is_portfolio_release(
    *,
    cm_visits: bool,
    postings: bool,
    review_meetings: bool,
    budget: bool,
    tributes: bool,
    others: bool,
    inspection: bool,
    minister_id: int | None,
    department_id: int | None,
) -> bool:
    if cm_visits or postings or review_meetings or budget or tributes or others or inspection:
        return False
    return minister_id is not None and department_id is not None


def _is_title_complete(
    *,
    minister_id: int | None,
    department_id: int | None,
    cm_visits: bool,
    review_meetings: bool,
    budget: bool,
    tributes: bool,
    others: bool,
    inspection: bool,
    postings: bool,
) -> bool:
    if postings:
        return True
    if budget or tributes or others or inspection:
        return True
    if review_meetings:
        return True
    if cm_visits and minister_id is not None:
        return True
    return minister_id is not None and department_id is not None


def _normalize_text(value: str) -> str:
    lowered = _APOSTROPHE_RE.sub("'", value.lower())
    lowered = lowered.replace("&", " and ")
    lowered = lowered.replace("dept", "department")
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return _NORMALIZE_TEXT_RE.sub(" ", lowered).strip()


def _clean_phrase(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = re.sub(r"\s+", " ", value).strip(" ,.-")
    return cleaned or None


def _normalize_title(title: str) -> str:
    text = _APOSTROPHE_RE.sub("'", title)
    text = _HONBLE_RE.sub("Hon'ble", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _extract_portfolio(title: str) -> tuple[str | None, bool]:
    if _CM_ACTOR_RE.search(title) and not _MINISTER_FOR_RE.search(title):
        return None, True

    chairmanship = _CHAIRMANSHIP_RE.search(title)
    if chairmanship:
        portfolio = _clean_phrase(chairmanship.group(1))
        if portfolio:
            return portfolio, False

    called_on = _CALLED_ON_MINISTER_RE.search(title)
    if called_on:
        portfolio = _clean_phrase(called_on.group(1))
        if portfolio:
            return portfolio, False

    match = _MINISTER_FOR_RE.search(title)
    if match:
        portfolio = _clean_phrase(match.group(1))
        if portfolio:
            return portfolio, False

    if _CM_SUBJECT_RE.search(title):
        return None, True

    return None, False


def _portfolio_to_department_name(portfolio: str | None) -> str | None:
    if not portfolio:
        return None
    cleaned = portfolio.strip()
    if cleaned.lower().endswith(" department"):
        return cleaned
    return f"{cleaned} Department"


def parse_gov_press_release_title(title: str | None) -> ParsedTitle:
    if not title or not title.strip():
        return ParsedTitle(None, None, False, "low")

    normalized = _normalize_title(title)
    person_match = _MINISTER_PERSON_RE.search(normalized)
    if person_match:
        prefix = person_match.group(1).strip().title()
        name = _clean_phrase(person_match.group(2))
        minister_name = f"{prefix} {name}".strip() if name else None
        return ParsedTitle(
            minister_name=minister_name,
            department_name=None,
            is_chief_minister=False,
            confidence="medium" if minister_name else "low",
        )

    portfolio, is_chief_minister = _extract_portfolio(normalized)
    department_name = _portfolio_to_department_name(portfolio)

    minister_name: str | None
    if is_chief_minister:
        minister_name = "Hon'ble Chief Minister"
    elif portfolio:
        minister_name = f"Hon'ble Minister for {portfolio}"
    else:
        minister_name = None

    if minister_name and department_name:
        confidence = "high"
    elif minister_name or department_name:
        confidence = "medium"
    else:
        confidence = "low"

    return ParsedTitle(
        minister_name=minister_name,
        department_name=department_name,
        is_chief_minister=is_chief_minister,
        confidence=confidence,
    )


def _portfolio_key(value: str | None) -> str:
    if not value:
        return ""
    cleaned = re.sub(r"\s+department$", "", value, flags=re.IGNORECASE)
    return _normalize_text(cleaned)


def _token_set(value: str | None) -> set[str]:
    if not value:
        return set()
    return {token for token in _portfolio_key(value).split() if len(token) > 2}


def _best_token_overlap(
    target: str | None,
    candidates: list[tuple[str, int]],
    *,
    minimum_score: float = 0.45,
) -> tuple[int | None, str | None]:
    target_tokens = _token_set(target)
    if not target_tokens:
        return None, None

    best_score = 0.0
    best_id: int | None = None
    for label, candidate_id in candidates:
        candidate_tokens = _token_set(label)
        if not candidate_tokens:
            continue
        overlap = len(target_tokens & candidate_tokens) / len(target_tokens | candidate_tokens)
        if overlap > best_score:
            best_score = overlap
            best_id = candidate_id

    if best_id is None or best_score < minimum_score:
        return None, None
    return best_id, ("high" if best_score >= 0.7 else "medium")


def _department_search_keys(name: str) -> list[str]:
    keys: set[str] = set()
    keys.add(_normalize_text(name))
    without_suffix = _portfolio_key(name)
    if without_suffix:
        keys.add(without_suffix)
    if " - " in name:
        tail = name.split(" - ", 1)[1]
        keys.add(_normalize_text(tail))
        tail_without_suffix = _portfolio_key(tail)
        if tail_without_suffix:
            keys.add(tail_without_suffix)
    return sorted((key for key in keys if key), key=len, reverse=True)


def _match_department_in_title(
    title: str | None,
    departments: list[DepartmentRow],
    *,
    minimum_key_length: int = 10,
) -> tuple[int | None, str | None, str | None]:
    if not title:
        return None, None, None

    title_key = _normalize_text(title)
    best: tuple[int, int, str] | None = None

    for department in departments:
        for key in _department_search_keys(department.name):
            if len(key) < minimum_key_length:
                continue
            if key in title_key:
                score = len(key)
                if best is None or score > best[0]:
                    best = (score, department.id, department.name)

    if best is None:
        return None, None, None
    return best[1], "high", best[2]


def _minister_from_department(
    department_id: int | None,
    *,
    departments: list[DepartmentRow],
    ministers: list[MinisterRow],
) -> tuple[int | None, str | None]:
    if department_id is None:
        return None, None

    dept_minister_name = next(
        (dept.minister_name for dept in departments if dept.id == department_id),
        None,
    )
    if not dept_minister_name:
        return None, None

    target = _normalize_text(dept_minister_name)
    for minister in ministers:
        minister_key = _normalize_text(minister.name)
        if target and (target in minister_key or minister_key in target):
            return minister.id, "high"

    return None, None


def _match_minister(
    parsed: ParsedTitle,
    *,
    departments: list[DepartmentRow],
    ministers: list[MinisterRow],
    department_id: int | None,
) -> tuple[int | None, str | None]:
    if parsed.is_chief_minister:
        chief = [minister for minister in ministers if minister.is_chief_minister]
        if chief:
            return chief[0].id, "high"

    if parsed.minister_name:
        candidate_key = _normalize_text(parsed.minister_name)
        if candidate_key:
            for minister in ministers:
                minister_key = _normalize_text(minister.name)
                if not minister_key:
                    continue
                if candidate_key in minister_key or minister_key in candidate_key:
                    return minister.id, "high"

    minister_candidates = [
        (
            re.sub(r"^minister for\s+", "", minister.designation, flags=re.IGNORECASE),
            minister.id,
        )
        for minister in ministers
    ]
    matched_id, confidence = _best_token_overlap(parsed.department_name, minister_candidates)
    if matched_id is not None:
        return matched_id, confidence

    if department_id is not None:
        matched_id, confidence = _minister_from_department(
            department_id,
            departments=departments,
            ministers=ministers,
        )
        if matched_id is not None:
            return matched_id, confidence

    return None, None


def _match_department(
    department_name: str | None,
    departments: list[DepartmentRow],
) -> tuple[int | None, str | None]:
    if not department_name:
        return None, None

    candidates = [(department.name, department.id) for department in departments]
    matched_id, confidence = _best_token_overlap(department_name, candidates)
    if matched_id is not None:
        return matched_id, confidence

    names = [department.name for department in departments]
    close = get_close_matches(department_name, names, n=1, cutoff=0.55)
    if close:
        for department in departments:
            if department.name == close[0]:
                return department.id, "medium"

    return None, None


def _department_override_id(title: str | None) -> int | None:
    if not title:
        return None
    lowered = _normalize_text(title)

    if "agriculture" in lowered and "budget" in lowered:
        return 2  # Agriculture - Farmers Welfare Department
    if "food and civil supplies" in lowered or "civil supplies" in lowered or "public distribution system" in lowered or "pds" in lowered:
        return 5  # Co-operation, Food and Consumer Protection Department
    if "handlooms" in lowered and ("khadi" in lowered or "textiles" in lowered):
        return 10  # Handlooms, Handicrafts, Textiles and Khadi Department
    if "energy resources and law" in lowered or "tneb" in lowered:
        return 7  # Energy Department
    if "transport" in lowered or "mtc" in lowered or "autorickshaw" in lowered:
        return 33  # Transport Department
    if "forests" in lowered:
        return 8  # Environment, Climate Change and Forests Department
    if "world environment day" in lowered or ("environment" in lowered and ("climate change" in lowered or "forests" in lowered)):
        return 8  # Environment, Climate Change and Forests Department
    if "finance" in lowered and ("planning" in lowered or "financial management" in lowered or "white paper" in lowered):
        return 9  # Finance Department
    if "hajj" in lowered or "minorities welfare" in lowered:
        return 4  # BC, MBC & Minorities Welfare Department
    if "hindu religious and charitable endowments" in lowered:
        return 46  # Hindu Religious and Charitable Endowments

    return None


def _department_from_minister(
    minister_id: int | None,
    *,
    ministers: list[MinisterRow],
    departments: list[DepartmentRow],
) -> tuple[int | None, str | None]:
    if minister_id is None:
        return None, None

    minister = next((item for item in ministers if item.id == minister_id), None)
    if not minister:
        return None, None

    designation = _normalize_text(minister.designation)
    if "food and civil supplies" in designation:
        return 5, "high"
    if "public works" in designation:
        return 42, "high"
    if "sports development" in designation:
        return 42, "high"
    if "forests" in designation:
        return 8, "high"
    if "transport" in designation:
        return 33, "high"
    if "energy" in designation:
        return 7, "high"
    if "handlooms" in designation or "textiles" in designation or "khadi" in designation:
        return 10, "high"
    if "finance" in designation:
        return 9, "high"
    if "minorities welfare" in designation:
        return 4, "high"
    if "hindu religious and charitable endowments" in designation:
        return 46, "high"
    if "agriculture" in designation:
        return 2, "high"

    minister_key = _normalize_text(minister.name)
    candidate_departments = [
        dept
        for dept in departments
        if dept.minister_name and (
            minister_key in _normalize_text(dept.minister_name)
            or _normalize_text(dept.minister_name) in minister_key
        )
    ]
    if not candidate_departments:
        return None, None

    best: tuple[float, int] | None = None
    for dept in candidate_departments:
        score = len(_token_set(dept.name) & _token_set(minister.designation))
        if best is None or score > best[0]:
            best = (score, dept.id)

    if not best:
        return None, None
    return best[1], "medium"


def load_ministers_from_manifest(manifest_path: Path | None = None) -> list[MinisterRow]:
    path = manifest_path or (
        _REPO_ROOT / "TN-GOV_Council Of Ministers" / "manifests" / "tn_ministers.json"
    )
    payload = json.loads(path.read_text(encoding="utf-8"))
    return [
        MinisterRow(
            id=int(item["id"]),
            name=str(item["name"]),
            designation=str(item["designation"]),
            portfolio=item.get("portfolio"),
            is_chief_minister=bool(item.get("is_chief_minister")),
        )
        for item in payload.get("ministers", [])
    ]


def load_departments_from_manifest(manifest_path: Path | None = None) -> list[DepartmentRow]:
    path = manifest_path or (_REPO_ROOT / "TN-GOV_Departments" / "manifests" / "tn_departments.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    return [
        DepartmentRow(
            id=int(item["id"]),
            name=str(item["name"]),
            minister_name=item.get("minister_name"),
        )
        for item in payload.get("departments", [])
    ]


def enrich_gov_press_release(
    title: str | None,
    *,
    ministers: list[MinisterRow],
    departments: list[DepartmentRow],
) -> dict[str, object]:
    is_posting = _is_posting_title(title)
    is_cm_visit = False if is_posting else _is_cm_visit_title(title)
    is_review_meeting = _is_review_meeting_title(title)
    if is_cm_visit and is_review_meeting:
        is_cm_visit = False
    is_budget = _is_budget_title(title)
    is_tributes = _is_tributes_title(title)
    is_others = _is_others_title(title)
    is_inspection = _is_inspection_title(title)

    parsed = parse_gov_press_release_title(title)
    department_id, department_confidence = _match_department(parsed.department_name, departments)
    dept_name_from_title: str | None = None
    if department_id is None:
        department_id, department_confidence, dept_name_from_title = _match_department_in_title(
            title,
            departments,
        )

    override_department_id = _department_override_id(title)
    if override_department_id is not None:
        department_id = override_department_id
        department_confidence = "high"

    if dept_name_from_title:
        parsed = ParsedTitle(
            minister_name=parsed.minister_name,
            department_name=dept_name_from_title,
            is_chief_minister=parsed.is_chief_minister,
            confidence="high" if parsed.minister_name else "medium",
        )

    minister_id, minister_confidence = _match_minister(
        parsed,
        departments=departments,
        ministers=ministers,
        department_id=department_id,
    )
    if minister_id is None:
        minister_id, minister_confidence = _minister_from_department(
            department_id,
            departments=departments,
            ministers=ministers,
        )

    if department_id is None and minister_id is not None and not is_cm_visit:
        dept_from_minister, dept_from_minister_conf = _department_from_minister(
            minister_id,
            ministers=ministers,
            departments=departments,
        )
        if dept_from_minister is not None:
            department_id = dept_from_minister
            department_confidence = dept_from_minister_conf or "medium"

    if parsed.department_name is None and department_id is not None:
        matched_department = next(
            (dept.name for dept in departments if dept.id == department_id),
            None,
        )
        if matched_department:
            parsed = ParsedTitle(
                minister_name=parsed.minister_name,
                department_name=matched_department,
                is_chief_minister=parsed.is_chief_minister,
                confidence=parsed.confidence,
            )

    if parsed.minister_name is None and minister_id is not None:
        matched_minister = next(
            (minister.name for minister in ministers if minister.id == minister_id),
            None,
        )
        if matched_minister:
            parsed = ParsedTitle(
                minister_name=matched_minister,
                department_name=parsed.department_name,
                is_chief_minister=parsed.is_chief_minister,
                confidence=parsed.confidence,
            )

    if is_posting:
        pass
    elif is_review_meeting:
        pass
    elif is_cm_visit:
        chief = _chief_minister(ministers)
        department_id = None
        department_confidence = None
        if chief:
            minister_id = chief.id
            minister_confidence = "high"
            parsed = ParsedTitle(
                minister_name=chief.name,
                department_name=None,
                is_chief_minister=True,
                confidence="high",
            )

    is_portfolio = _is_portfolio_release(
        cm_visits=is_cm_visit,
        postings=is_posting,
        review_meetings=is_review_meeting,
        budget=is_budget,
        tributes=is_tributes,
        others=is_others,
        inspection=is_inspection,
        minister_id=minister_id,
        department_id=department_id,
    )

    return {
        "minister_name": parsed.minister_name,
        "department_name": parsed.department_name,
        "minister_id": minister_id,
        "department_id": department_id,
        "district_id": None,
        "title_parsed": _is_title_complete(
            minister_id=minister_id,
            department_id=department_id,
            cm_visits=is_cm_visit,
            review_meetings=is_review_meeting,
            budget=is_budget,
            tributes=is_tributes,
            others=is_others,
            inspection=is_inspection,
            postings=is_posting,
        ),
        "parse_confidence": parsed.confidence,
        "minister_match_confidence": minister_confidence,
        "department_match_confidence": department_confidence,
        "cm_visits": is_cm_visit,
        "postings": is_posting,
        "review_meetings": is_review_meeting,
        "budget": is_budget,
        "tributes": is_tributes,
        "others": is_others,
        "inspection": is_inspection,
        "portfolio": is_portfolio,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Audit title enrichment on gov press release JSON files.",
    )
    parser.add_argument(
        "--json-dir",
        default=str(_REPO_ROOT / "TN-GOV-Press Release" / "Response JSON"),
        help="Folder containing YYYY-MM-DD.json files.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print enrichment details for each release.",
    )
    args = parser.parse_args()

    json_dir = Path(args.json_dir)
    if not json_dir.is_dir():
        raise SystemExit(f"JSON directory not found: {json_dir}")

    ministers = load_ministers_from_manifest()
    departments = load_departments_from_manifest()

    total = 0
    linked = 0
    parsed = 0
    counts = {"high": 0, "medium": 0, "low": 0}

    for path in sorted(json_dir.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        releases = payload.get("releases", [])
        if not isinstance(releases, list):
            continue

        for release in releases:
            if not isinstance(release, dict):
                continue
            title = release.get("title")
            total += 1
            enrichment = enrich_gov_press_release(
                str(title) if title is not None else None,
                ministers=ministers,
                departments=departments,
            )
            confidence = str(enrichment.get("parse_confidence") or "low")
            counts[confidence] = counts.get(confidence, 0) + 1
            if enrichment.get("title_parsed"):
                parsed += 1
            if enrichment.get("minister_id") is not None and enrichment.get("department_id") is not None:
                linked += 1
            if args.verbose:
                print(f"\n{path.name}: {title}")
                print(f"  minister_id={enrichment.get('minister_id')}")
                print(f"  department_id={enrichment.get('department_id')}")
                print(f"  parse_confidence={confidence}")

    print(
        f"Audited {total} release(s) in {json_dir}. "
        f"parsed={parsed}, linked={linked}, "
        f"high={counts.get('high', 0)}, medium={counts.get('medium', 0)}, low={counts.get('low', 0)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
