"""
Parse tn_press_release.name into release_type, department_name, and topic.

Usage:
  python tn_press_release_parse_names.py
  python tn_press_release_parse_names.py --id 21703
  python tn_press_release_parse_names.py --all
  python tn_press_release_parse_names.py --dry-run
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

_PREFIX_RE = re.compile(
    r"^(?:DIPR|TNLA)\s*[-\.\s]*"
    r"(?:P\.?\s*R\.?\s*No\.?|TNLA)?\s*[-\.\s]*\d+\s*[-\.\s]*",
    flags=re.IGNORECASE,
)
_DATE_SUFFIX_RE = re.compile(
    r"\s*[-\.\s]*Date[\s\.\-]*\d{1,2}[\.\-/]\d{1,2}[\.\-/]\d{2,4}\s*$",
    flags=re.IGNORECASE,
)
_LANG_SUFFIX_RE = re.compile(r"\s*[-\.\s]*(English|Tamil)\s*$", flags=re.IGNORECASE)
_DEPT_SEGMENT_RE = re.compile(
    r"^(.+?\s+Dept)\s+(.+)$",
    flags=re.IGNORECASE,
)
_DEPT_TOKEN_RE = re.compile(
    r"\bDept\b|\bDepartment\b|Minister for\s+.+|MAWS\s+Dept|EB\s+Dept|RD\s+Dept",
    flags=re.IGNORECASE,
)
_GENERIC_PRESS_RELEASE = re.compile(r"^Press Release$", flags=re.IGNORECASE)

_RELEASE_TYPES: tuple[str, ...] = (
    "Hon'ble CM Press Release",
    "Hon'ble CM Assembly Speech",
    "Hon'ble CM Speech",
    "Hon'ble Minister for Rural Development and Water Resources Press Release",
    "Hon'ble Rural Development and Water Resources Minister Press Release",
    "Hon'ble Rural Development and Water Resources Review Meeting Press Release",
    "Hon'ble CM DO Letter",
    "Press Release",
)


@dataclass(frozen=True)
class PressReleaseRow:
    id: int
    name: str
    dipr_pr_no: str | None


@dataclass(frozen=True)
class MinisterRow:
    id: int
    name: str
    designation: str
    portfolio: str | None
    is_chief_minister: bool


@dataclass(frozen=True)
class ParsedName:
    release_type: str | None
    department_name: str | None
    topic: str | None
    confidence: str


_MINISTER_FOR_RE = re.compile(r"minister\s+for\s+(.+)$", flags=re.IGNORECASE)
_NORMALIZE_TEXT_RE = re.compile(r"[^a-z0-9]+")


def _normalize_minister_match_text(value: str) -> str:
    lowered = value.lower()
    lowered = lowered.replace("&", " and ")
    lowered = lowered.replace("dept", "department")
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return _NORMALIZE_TEXT_RE.sub(" ", lowered).strip()


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


def _match_minister_by_name(
    minister_name: str,
    ministers: list[MinisterRow],
) -> tuple[int | None, str | None]:
    if not minister_name.strip():
        return None, None
    normalized = _normalize_minister_match_text(minister_name)
    direct = [
        minister
        for minister in ministers
        if normalized
        and normalized in _normalize_minister_match_text(minister.name)
    ]
    if len(direct) == 1:
        return direct[0].id, "high"

    names = [minister.name for minister in ministers]
    close = get_close_matches(minister_name, names, n=1, cutoff=0.7)
    if close:
        for minister in ministers:
            if minister.name == close[0]:
                return minister.id, "medium"

    return None, None


def _match_minister_by_portfolio(
    department_name: str,
    ministers: list[MinisterRow],
) -> tuple[int | None, str | None]:
    dept_key = _normalize_minister_match_text(department_name)
    if not dept_key:
        return None, None

    best: tuple[int, int] | None = None  # (minister_id, score)
    for minister in ministers:
        if not minister.portfolio:
            continue
        portfolio_key = _normalize_minister_match_text(minister.portfolio)
        if dept_key and dept_key in portfolio_key:
            score = len(dept_key)
            if best is None or score > best[1]:
                best = (minister.id, score)

    if best is not None:
        # A long department name substring match is generally reliable.
        return best[0], ("high" if best[1] >= 18 else "medium")
    return None, None


def match_minister(
    parsed: ParsedName,
    *,
    dept_minister_name: str | None,
    ministers: list[MinisterRow],
) -> tuple[int | None, str | None]:
    release_type = parsed.release_type or ""
    if release_type and "cm" in release_type.lower():
        chief = [minister for minister in ministers if minister.is_chief_minister]
        if chief:
            return chief[0].id, "high"

    if dept_minister_name:
        matched_id, confidence = _match_minister_by_name(dept_minister_name, ministers)
        if matched_id is not None:
            return matched_id, confidence

    if parsed.department_name:
        matched_id, confidence = _match_minister_by_portfolio(parsed.department_name, ministers)
        if matched_id is not None:
            return matched_id, confidence

    if release_type:
        match = _MINISTER_FOR_RE.search(release_type)
        if match:
            matched_id, confidence = _match_minister_by_portfolio(match.group(1), ministers)
            if matched_id is not None:
                return matched_id, confidence

    return None, None


def _load_db_url() -> str:
    if str(_PUBLIC_DB) not in sys.path:
        sys.path.insert(0, str(_PUBLIC_DB))
    from config import get_database_url

    url = get_database_url()
    if not url:
        raise SystemExit("DATABASE_URL / SUPABASE_DB_PASSWORD is not configured in Public DB/.env")
    return url


def _normalize_apostrophes(text: str) -> str:
    return text.replace("'", "'").replace("`", "'").replace("’", "'")


def _normalize_separators(text: str) -> str:
    text = _normalize_apostrophes(text)
    text = re.sub(r"\s+-\s+", " - ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip(" -")


def _split_segments(body: str) -> list[str]:
    return [part.strip() for part in re.split(r"\s+-\s+", body) if part.strip()]


def _strip_prefix(name: str) -> str:
    return _PREFIX_RE.sub("", name, count=1).strip(" -")


def _strip_suffixes(body: str) -> str:
    previous = None
    current = body.strip()
    while current != previous:
        previous = current
        current = _DATE_SUFFIX_RE.sub("", current).strip(" -")
        current = _LANG_SUFFIX_RE.sub("", current).strip(" -")
    return current


def _clean_topic(value: str | None) -> str | None:
    if not value:
        return None
    topic = value.strip(" -")
    topic = re.sub(r"\s*Press Release\s*$", "", topic, flags=re.IGNORECASE).strip(" -")
    return topic or None


def _detect_release_type(text: str) -> tuple[str | None, str]:
    normalized = _normalize_apostrophes(text)
    for release_type in _RELEASE_TYPES:
        if normalized.lower().startswith(release_type.lower()):
            remainder = normalized[len(release_type) :].strip(" -")
            return release_type, remainder
    return None, normalized


def _is_department_segment(segment: str) -> bool:
    if _GENERIC_PRESS_RELEASE.match(segment):
        return False
    if _DEPT_TOKEN_RE.search(segment):
        return True
    return segment.endswith(" Dept") or segment.endswith(" Department")


def _split_department_segment(segment: str) -> tuple[str, str | None]:
    match = _DEPT_SEGMENT_RE.match(segment)
    if not match:
        return segment, None
    department = match.group(1).strip()
    topic = _clean_topic(match.group(2))
    if _GENERIC_PRESS_RELEASE.match(topic or ""):
        topic = None
    return department, topic


def parse_press_release_name(name: str) -> ParsedName:
    body = _strip_suffixes(_strip_prefix(_normalize_separators(name)))
    if not body:
        return ParsedName(None, None, None, "low")

    release_type: str | None = None
    topic: str | None = None
    department_name: str | None = None
    confidence = "medium"

    if " - " in body:
        parts = _split_segments(body)
    else:
        parts = [body]

    release_type, remainder = _detect_release_type(parts[0])
    if release_type:
        parts = ([remainder] if remainder else []) + parts[1:]

    dept_index: int | None = None
    for index, part in enumerate(parts):
        if _is_department_segment(part):
            dept_index = index
            break

    if dept_index is not None:
        department_name, inline_topic = _split_department_segment(parts[dept_index])
        if inline_topic:
            topic = inline_topic
            confidence = "high"
        tail = [part for i, part in enumerate(parts) if i != dept_index]
        if tail:
            topic = _clean_topic(tail[-1]) or topic
            if len(tail) > 1 and not topic:
                topic = _clean_topic(" - ".join(tail))
        if not topic and len(parts) == 1 and not inline_topic:
            _, topic = _split_department_segment(parts[0])
    elif len(parts) >= 2:
        topic = _clean_topic(parts[-1])
        if _is_department_segment(parts[0]):
            department_name, inline_topic = _split_department_segment(parts[0])
            topic = inline_topic or topic
    elif len(parts) == 1:
        if _is_department_segment(parts[0]):
            department_name, topic = _split_department_segment(parts[0])
        else:
            topic = _clean_topic(parts[0])

    if release_type is None and topic and _GENERIC_PRESS_RELEASE.match(topic):
        release_type = "Press Release"
        topic = None

    if not release_type and not department_name and topic:
        confidence = "low"
    elif department_name and (topic or release_type):
        confidence = "high"
    elif department_name or release_type or topic:
        confidence = "medium"
    else:
        confidence = "low"

    return ParsedName(
        release_type=release_type,
        department_name=department_name,
        topic=topic,
        confidence=confidence,
    )


def fetch_press_rows(
    *,
    press_id: int | None = None,
    pending_only: bool = True,
) -> list[PressReleaseRow]:
    import psycopg2

    conditions: list[str] = []
    params: list[object] = []

    if press_id is not None:
        conditions.append("id = %s")
        params.append(press_id)
    elif pending_only:
        conditions.append("name_parsed = false")

    query = "select id, name, dipr_pr_no from public.tn_press_release"
    if conditions:
        query += " where " + " and ".join(conditions)
    query += " order by id"

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

    if press_id is not None and not rows:
        raise SystemExit(f"No tn_press_release row found for id={press_id}.")

    return [
        PressReleaseRow(id=row[0], name=row[1], dipr_pr_no=row[2])
        for row in rows
    ]


def fetch_departments() -> list[tuple[int, str, str | None]]:
    import psycopg2

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.execute("select id, name, minister_name from public.tn_dept order by id")
            return [(row[0], row[1], row[2]) for row in cur.fetchall()]


def _match_department_id(
    department_name: str | None,
    departments: list[tuple[int, str, str | None]],
) -> int | None:
    if not department_name:
        return None

    normalized = department_name.lower().replace("dept", "department").strip()
    for dept_id, dept_name, _minister_name in departments:
        candidate = dept_name.lower()
        if normalized in candidate or candidate in normalized:
            return dept_id

    short = department_name.replace(" Dept", " Department")
    names = [name for _, name, _ in departments]
    match = get_close_matches(short, names, n=1, cutoff=0.55)
    if not match:
        return None
    for dept_id, dept_name, _minister_name in departments:
        if dept_name == match[0]:
            return dept_id
    return None


def save_parsed_names(
    updates: list[tuple[PressReleaseRow, ParsedName, int | None, int | None, str | None]],
) -> None:
    if not updates:
        return

    import psycopg2

    with psycopg2.connect(_load_db_url()) as conn:
        with conn.cursor() as cur:
            cur.executemany(
                """
                update public.tn_press_release
                set release_type = %s,
                    department_name = %s,
                    topic = %s,
                    department_id = %s,
                    minister_id = %s,
                    name_parsed = true,
                    parse_confidence = %s,
                    minister_match_confidence = %s
                where id = %s
                """,
                [
                    (
                        parsed.release_type,
                        parsed.department_name,
                        parsed.topic,
                        department_id,
                        minister_id,
                        parsed.confidence,
                        minister_confidence,
                        row.id,
                    )
                    for row, parsed, department_id, minister_id, minister_confidence in updates
                ],
            )
        conn.commit()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Parse tn_press_release.name into structured metadata columns."
    )
    parser.add_argument("--id", type=int, help="Process only this tn_press_release.id.")
    parser.add_argument(
        "--all",
        action="store_true",
        help="Process all rows, including those already marked name_parsed = true.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and print only; do not update tn_press_release.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print parsed output for each processed row.",
    )
    args = parser.parse_args()

    pending_only = not args.all and args.id is None
    rows = fetch_press_rows(press_id=args.id, pending_only=pending_only)
    departments = [] if args.dry_run else fetch_departments()
    ministers = [] if args.dry_run else fetch_ministers()
    dept_to_minister_name = (
        {dept_id: minister_name for dept_id, _name, minister_name in departments}
        if departments
        else {}
    )

    print(f"Found {len(rows)} tn_press_release row(s) to parse.")
    counts = {"high": 0, "medium": 0, "low": 0}
    updates: list[tuple[PressReleaseRow, ParsedName, int | None, int | None, str | None]] = []

    for index, row in enumerate(rows, start=1):
        parsed = parse_press_release_name(row.name)
        counts[parsed.confidence] = counts.get(parsed.confidence, 0) + 1
        department_id = _match_department_id(parsed.department_name, departments)
        dept_minister_name = dept_to_minister_name.get(department_id) if department_id else None
        minister_id, minister_confidence = match_minister(
            parsed,
            dept_minister_name=dept_minister_name,
            ministers=ministers,
        )
        updates.append((row, parsed, department_id, minister_id, minister_confidence))

        if args.verbose or args.id is not None or args.dry_run:
            print(f"\n[{index}/{len(rows)}] id={row.id}")
            print(f"name: {row.name}")
            print(f"release_type: {parsed.release_type}")
            print(f"department_name: {parsed.department_name}")
            print(f"topic: {parsed.topic}")
            print(f"parse_confidence: {parsed.confidence}")
            print(f"department_id: {department_id}")
            print(f"minister_id: {minister_id}")
            print(f"minister_match_confidence: {minister_confidence}")

    if not args.dry_run:
        save_parsed_names(updates)

    print(
        f"\nDone. high={counts.get('high', 0)}, "
        f"medium={counts.get('medium', 0)}, low={counts.get('low', 0)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
