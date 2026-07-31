"""
Parse tn_gov_press_releases.title into minister and department fields with FK links.

Usage:
  python tn_gov_press_release_parse_titles.py
  python tn_gov_press_release_parse_titles.py --id 1
  python tn_gov_press_release_parse_titles.py --all
  python tn_gov_press_release_parse_titles.py --dry-run --verbose
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from difflib import get_close_matches
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PUBLIC_DB = _REPO_ROOT / "Public DB"

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
class GovPressReleaseRow:
    id: int
    title: str | None
    minister_id: int | None = None
    department_id: int | None = None


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


def _load_db_url() -> str:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import get_database_url

    url = get_database_url()
    if not url:
        raise SystemExit("DATABASE_URL / SUPABASE_DB_PASSWORD is not configured in Public DB/.env")
    return url


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


def fetch_rows(*, release_id: int | None = None, pending_only: bool = True) -> list[GovPressReleaseRow]:
    import psycopg2

    conditions: list[str] = []
    params: list[object] = []

    if release_id is not None:
        conditions.append("id = %s")
        params.append(release_id)
    elif pending_only:
        conditions.append(
            "(title_parsed = false or minister_id is null or department_id is null)"
        )

    query = "select id, title, minister_id, department_id from public.tn_gov_press_releases"
    if conditions:
        query += " where " + " and ".join(conditions)
    query += " order by id"

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    if release_id is not None and not rows:
        raise SystemExit(f"No tn_gov_press_releases row found for id={release_id}.")

    return [
        GovPressReleaseRow(id=row[0], title=row[1], minister_id=row[2], department_id=row[3])
        for row in rows
    ]


def fetch_ministers() -> list[MinisterRow]:
    import psycopg2

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select id, name, designation, portfolio, is_chief_minister
                from public.tn_ministers
                order by id
                """
            )
            rows = cur.fetchall()

    return [
        MinisterRow(
            id=row[0],
            name=row[1],
            designation=row[2],
            portfolio=row[3],
            is_chief_minister=bool(row[4]),
        )
        for row in rows
    ]


def fetch_departments() -> list[DepartmentRow]:
    import psycopg2

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.execute("select id, name, minister_name from public.tn_dept order by id")
            rows = cur.fetchall()

    return [DepartmentRow(id=row[0], name=row[1], minister_name=row[2]) for row in rows]


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


def save_parsed_titles(
    updates: list[
        tuple[
            GovPressReleaseRow,
            ParsedTitle,
            int | None,
            int | None,
            bool,
            bool,
            bool,
            bool,
            bool,
            bool,
            bool,
            bool,
            str | None,
            str | None,
        ]
    ],
) -> None:
    if not updates:
        return

    import psycopg2

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                update public.tn_gov_press_releases
                set minister_name = %s,
                    department_name = %s,
                    minister_id = %s,
                    department_id = %s,
                    cm_visits = %s,
                    postings = %s,
                    review_meetings = %s,
                    budget = %s,
                    tributes = %s,
                    others = %s,
                    inspection = %s,
                    portfolio = %s,
                    title_parsed = %s,
                    parse_confidence = %s,
                    minister_match_confidence = %s,
                    department_match_confidence = %s
                where id = %s
                """,
                [
                    (
                        parsed.minister_name,
                        parsed.department_name,
                        minister_id,
                        department_id,
                        cm_visits,
                        postings,
                        review_meetings,
                        budget,
                        tributes,
                        others,
                        inspection,
                        portfolio,
                        _is_title_complete(
                            minister_id=minister_id,
                            department_id=department_id,
                            cm_visits=cm_visits,
                            review_meetings=review_meetings,
                            budget=budget,
                            tributes=tributes,
                            others=others,
                            inspection=inspection,
                            postings=postings,
                        ),
                        parsed.confidence,
                        minister_confidence,
                        department_confidence,
                        row.id,
                    )
                    for row, parsed, minister_id, department_id, cm_visits, postings, review_meetings, budget, tributes, others, inspection, portfolio, minister_confidence, department_confidence in updates
                ],
            )
        conn.commit()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Parse tn_gov_press_releases.title into minister and department links.",
    )
    parser.add_argument("--id", type=int, help="Process only this tn_gov_press_releases.id.")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all rows, not only pending/unlinked rows.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and print only; do not update tn_gov_press_releases.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print parsed output for each processed row.",
    )
    args = parser.parse_args()

    pending_only = not args.all and args.id is None
    rows = fetch_rows(release_id=args.id, pending_only=pending_only)

    departments: list[DepartmentRow] = []
    ministers: list[MinisterRow] = []
    if not args.dry_run or args.verbose:
        departments = fetch_departments()
        ministers = fetch_ministers()

    print(f"Found {len(rows)} tn_gov_press_releases row(s) to parse.")
    counts = {"high": 0, "medium": 0, "low": 0}
    linked = 0
    cm_visits_count = 0
    review_meetings_count = 0
    postings_count = 0
    budget_count = 0
    tributes_count = 0
    others_count = 0
    inspection_count = 0
    portfolio_count = 0
    updates: list[
        tuple[
            GovPressReleaseRow,
            ParsedTitle,
            int | None,
            int | None,
            bool,
            bool,
            bool,
            bool,
            bool,
            bool,
            bool,
            bool,
            str | None,
            str | None,
        ]
    ] = []

    for index, row in enumerate(rows, start=1):
        is_posting = _is_posting_title(row.title)
        is_cm_visit = False if is_posting else _is_cm_visit_title(row.title)
        is_review_meeting = _is_review_meeting_title(row.title)
        if is_cm_visit and is_review_meeting:
            is_cm_visit = False
        is_budget = _is_budget_title(row.title)
        is_tributes = _is_tributes_title(row.title)
        is_others = _is_others_title(row.title)
        is_inspection = _is_inspection_title(row.title)

        if is_budget:
            budget_count += 1
        if is_tributes:
            tributes_count += 1
        if is_others:
            others_count += 1
        if is_inspection:
            inspection_count += 1
        parsed = parse_gov_press_release_title(row.title)
        counts[parsed.confidence] = counts.get(parsed.confidence, 0) + 1

        department_id, department_confidence = _match_department(parsed.department_name, departments)
        dept_name_from_title: str | None = None
        if department_id is None:
            department_id, department_confidence, dept_name_from_title = _match_department_in_title(
                row.title,
                departments,
            )

        override_department_id = _department_override_id(row.title)
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
        minister_id = minister_id if minister_id is not None else row.minister_id
        department_id = department_id if department_id is not None else row.department_id

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
            postings_count += 1
        elif is_review_meeting:
            review_meetings_count += 1
        elif is_cm_visit:
            cm_visits_count += 1
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

        if minister_id is not None and department_id is not None:
            linked += 1

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
        if is_portfolio:
            portfolio_count += 1

        updates.append(
            (
                row,
                parsed,
                minister_id,
                department_id,
                is_cm_visit,
                is_posting,
                is_review_meeting,
                is_budget,
                is_tributes,
                is_others,
                is_inspection,
                is_portfolio,
                minister_confidence,
                department_confidence,
            )
        )

        if args.verbose or args.id is not None or args.dry_run:
            print(f"\n[{index}/{len(rows)}] id={row.id}")
            print(f"title: {row.title}")
            print(f"minister_name: {parsed.minister_name}")
            print(f"department_name: {parsed.department_name}")
            print(f"cm_visits: {is_cm_visit}")
            print(f"review_meetings: {is_review_meeting}")
            print(f"postings: {is_posting}")
            print(f"budget: {is_budget}")
            print(f"tributes: {is_tributes}")
            print(f"others: {is_others}")
            print(f"inspection: {is_inspection}")
            print(f"portfolio: {is_portfolio}")
            print(f"parse_confidence: {parsed.confidence}")
            print(f"minister_id: {minister_id} ({minister_confidence})")
            print(f"department_id: {department_id} ({department_confidence})")

    if not args.dry_run:
        save_parsed_titles(updates)

    print(
        f"\nDone. linked={linked}, cm_visits={cm_visits_count}, review_meetings={review_meetings_count}, "
        f"postings={postings_count}, budget={budget_count}, tributes={tributes_count}, others={others_count}, "
        f"inspection={inspection_count}, portfolio={portfolio_count}, "
        f"high={counts.get('high', 0)}, medium={counts.get('medium', 0)}, low={counts.get('low', 0)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
