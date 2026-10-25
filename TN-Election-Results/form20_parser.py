"""Parse Tamil Nadu CEO Form 20 PDF tables (polling-station-wise results)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any


def _cell(value: Any) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value).strip())
    return text or None


def _parse_int(value: Any) -> int:
    text = _cell(value)
    if not text:
        return 0
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else 0


def _unmirror_text(text: str) -> str:
    return "\n".join(line[::-1] for line in text.split("\n"))


def _fold(text: str) -> str:
    """Compact uppercase letters/digits for fuzzy header matching (handles mirrored PDF text)."""
    combined = f"{text}\n{_unmirror_text(text)}"
    return re.sub(r"[^A-Z0-9]", "", combined.upper())


def _contains(text: str | None, *fragments: str) -> bool:
    if not text:
        return False
    folded = _fold(text)
    return all(fragment in folded for fragment in fragments)


def _is_total_row(first_cell: str | None) -> bool:
    if not first_cell:
        return False
    folded = _fold(first_cell)
    return "TOTAL" in folded and "POLL" in folded


def _is_serial_header(first_cell: str | None) -> bool:
    if not first_cell:
        return False
    return _contains(first_cell, "SERIAL", "POLL")


def _is_form20_banner(first_cell: str | None) -> bool:
    if not first_cell:
        return False
    return _contains(first_cell, "FORM", "20") or _contains(first_cell, "FINAL", "RESULT")


def _is_index_number_row(row: list[Any], start_col: int = 0) -> bool:
    cells = [_cell(c) for c in row[start_col:] if _cell(c)]
    if len(cells) < 5:
        return False
    if not all(cell.isdigit() for cell in cells):
        return False
    numbers = [int(cell) for cell in cells]
    return numbers == list(range(1, len(numbers) + 1))


def _is_candidate_meta_row(row: list[Any], vote_start: int) -> bool:
    first = _cell(row[0]) if row else None
    if first and first.isdigit():
        return False
    chunk = [_cell(c) for c in row[vote_start:-5] if _cell(c)]
    if len(chunk) < 3:
        return False
    digitish = sum(1 for c in chunk if c.isdigit())
    return digitish < len(chunk) / 2


def _is_skip_label_row(first_cell: str | None) -> bool:
    if not first_cell:
        return False
    folded = _fold(first_cell)
    if folded in {"SLNO", "SERIALNO"}:
        return True
    return _contains(first_cell, "NAME", "CANDIDATE") or _contains(first_cell, "ROUND", "WISE")


@dataclass(frozen=True)
class _TableLayout:
    kind: str
    header_row: int
    ps_col: int
    vote_start: int


def _find_header_row(table: list[list[Any]]) -> _TableLayout | None:
    scan_limit = min(len(table), 30)
    for row_index in range(scan_limit):
        row = table[row_index]
        if not row:
            continue
        c0 = _cell(row[0]) or ""
        c1 = _cell(row[1]) if len(row) > 1 else None

        if _contains(c0, "POLLING", "BOOTH") and not _contains(c0, "STATION", "NAME"):
            continue

        if _is_serial_header(c0):
            return _TableLayout("simple", row_index, 0, 1)

        if c1 and _contains(c0, "SERIAL", "NO") and _contains(c1, "POLL"):
            return _TableLayout("indexed", row_index, 1, 2)

        if c1 and _contains(c0, "SL", "NO") and _contains(c1, "POLL"):
            return _TableLayout("indexed", row_index, 1, 2)

        if c1 and _contains(c0, "SLNO") and _contains(c1, "STATION"):
            return _TableLayout("indexed", row_index, 1, 2)

        if c1 and _contains(c1, "POLL") and (
            _contains(c0, "SL", "NO") or _contains(c0, "SERIAL", "NO")
        ):
            return _TableLayout("indexed", row_index, 1, 2)

        if c1 and _contains(c1, "POLL") and c0 and _contains(c0, "SERIAL"):
            return _TableLayout("indexed", row_index, 1, 2)

        c2 = _cell(row[2]) if len(row) > 2 else None
        if c1 and c2 and _contains(c1, "POLL") and (
            _contains(c2, "NAME", "STATION") or _contains(c2, "NAME", "POLL")
        ):
            return _TableLayout("detailed", row_index, 1, 4)

        if c1 and _contains(c0, "SL", "NO") and _contains(c1, "POLL", "STATION"):
            return _TableLayout("indexed", row_index, 1, 2)

        if c1 and _contains(c0, "TABLE", "SERIAL") and (
            _contains(c1, "SP") or _contains(c1, "POLL") or _contains(c1, "NO")
        ):
            return _TableLayout("indexed", row_index, 1, 2)

    return None


def _find_transposed_layout(table: list[list[Any]]) -> tuple[int, int, int] | None:
    booth_row = None
    candidate_header = None
    for row_index, row in enumerate(table[:15]):
        c0 = _cell(row[0]) if row else None
        if not c0:
            continue
        if _contains(c0, "TABLE", "NO") and booth_row is None:
            booth_row = row_index
        if _contains(c0, "POLLING", "BOOTH"):
            booth_row = row_index
        if _contains(c0, "NAME", "CANDIDATE"):
            candidate_header = row_index

    if booth_row is None or candidate_header is None:
        return None
    return booth_row, candidate_header, 2


def _extract_candidates(
    table: list[list[Any]],
    layout: _TableLayout,
) -> list[str]:
    if layout.kind == "simple":
        header = table[layout.header_row]
        names: list[str] = []
        for cell in header[layout.vote_start : -5]:
            name = _cell(cell)
            if name:
                names.append(name)
        if names:
            return names
        if layout.header_row + 1 < len(table):
            for cell in table[layout.header_row + 1][layout.vote_start : -5]:
                name = _cell(cell)
                if name:
                    names.append(name)
        return names

    best: list[str] = []
    candidate_rows = {layout.header_row}
    for offset in (-2, -1, 1, 2, 3):
        candidate_rows.add(layout.header_row + offset)
    for row_index in sorted(candidate_rows):
        if row_index < 0 or row_index >= len(table):
            continue
        row = table[row_index]
        chunk = [_cell(c) for c in row[layout.vote_start : -5]]
        names = [name for name in chunk if name and not name.isdigit()]
        if len(names) > len(best):
            best = names
    return best


def _parse_booth_row(
    row: list[Any],
    layout: _TableLayout,
    candidate_count: int,
) -> dict[str, Any] | None:
    if len(row) <= layout.ps_col:
        return None
    ps = _cell(row[layout.ps_col])
    if not ps or not ps.isdigit():
        return None

    location = None
    electors = None
    if layout.kind == "detailed":
        location = _cell(row[2]) if len(row) > 2 else None
        if location and location.isdigit():
            location = None
        electors = _parse_int(row[3]) if len(row) > 3 else None
        if location and len(location) < 4 and not any(ch.isalpha() for ch in location):
            location = None

    vote_cells = row[layout.vote_start : -5]
    votes = [_parse_int(vote_cells[i]) if i < len(vote_cells) else 0 for i in range(candidate_count)]
    tail = row[-5:] if len(row) >= 5 else []
    return {
        "polling_station_serial": int(ps),
        "location": location,
        "electors": electors if electors else None,
        "votes": votes,
        "valid_votes": _parse_int(tail[0]) if len(tail) > 0 else sum(votes),
        "rejected_votes": _parse_int(tail[1]) if len(tail) > 1 else 0,
        "nota": _parse_int(tail[2]) if len(tail) > 2 else 0,
        "total": _parse_int(tail[3]) if len(tail) > 3 else 0,
        "tendered_votes": _parse_int(tail[4]) if len(tail) > 4 else 0,
    }


def _parse_transposed_table(table: list[list[Any]]) -> tuple[list[str], list[dict[str, Any]]]:
    layout = _find_transposed_layout(table)
    if layout is None:
        return [], []
    booth_row_index, candidate_header_index, vote_start = layout
    booth_row = table[booth_row_index]

    booth_columns: list[tuple[int, int]] = []
    for col_index in range(vote_start, len(booth_row)):
        booth_no = _cell(booth_row[col_index])
        if booth_no and booth_no.isdigit():
            booth_columns.append((col_index, int(booth_no)))

    if not booth_columns:
        return [], []

    candidates: list[str] = []
    vote_rows: list[list[int]] = []
    nota_row: list[int] | None = None
    rejected_row: list[int] | None = None

    for row in table[candidate_header_index + 1 :]:
        label = _cell(row[1]) if len(row) > 1 else _cell(row[0])
        if not label:
            continue
        folded = _fold(label)
        if "NOTA" in folded:
            nota_row = [_parse_int(row[col]) for col, _ in booth_columns]
            continue
        if "REJECTED" in folded:
            rejected_row = [_parse_int(row[col]) for col, _ in booth_columns]
            continue
        if "TOTAL" in folded and "POLL" in folded:
            break
        if _contains(label, "CONTROL", "UNIT"):
            continue
        if _contains(label, "ELECTORS", "ASSIGNED"):
            continue

        votes = [_parse_int(row[col]) if col < len(row) else 0 for col, _ in booth_columns]
        if not any(votes):
            continue
        candidates.append(label)
        vote_rows.append(votes)

    if not candidates or not vote_rows:
        return [], []

    booths: list[dict[str, Any]] = []
    for booth_index, (col_index, booth_no) in enumerate(booth_columns):
        per_candidate = [vote_rows[cand_index][booth_index] for cand_index in range(len(candidates))]
        booths.append(
            {
                "polling_station_serial": booth_no,
                "location": None,
                "electors": None,
                "votes": per_candidate,
                "valid_votes": sum(per_candidate),
                "rejected_votes": rejected_row[booth_index] if rejected_row else 0,
                "nota": nota_row[booth_index] if nota_row else 0,
                "total": sum(per_candidate)
                + (rejected_row[booth_index] if rejected_row else 0)
                + (nota_row[booth_index] if nota_row else 0),
                "tendered_votes": 0,
            }
        )
    return candidates, booths


def _parse_grid_table(table: list[list[Any]]) -> tuple[str, list[str], list[dict[str, Any]]]:
    transposed = _find_transposed_layout(table)
    if transposed:
        candidates, booths = _parse_transposed_table(table)
        if booths:
            return "transposed", candidates, booths

    layout = _find_header_row(table)
    if layout is None:
        return "unknown", [], []

    candidates = _extract_candidates(table, layout)
    if not candidates:
        return layout.kind, [], []

    booths: list[dict[str, Any]] = []
    for row_index, row in enumerate(table[layout.header_row + 1 :], start=layout.header_row + 1):
        first = _cell(row[0]) if row else None
        if _is_total_row(first):
            break
        if _is_skip_label_row(first):
            continue
        if _is_form20_banner(first):
            continue
        if _is_index_number_row(row, layout.vote_start):
            continue
        if _is_index_number_row(row, 0):
            continue
        if _is_candidate_meta_row(row, layout.vote_start):
            continue

        booth = _parse_booth_row(row, layout, len(candidates))
        if booth:
            booths.append(booth)

    return layout.kind, candidates, booths


def pdf_has_extractable_grid(pdf_bytes: bytes) -> bool:
    """True if the PDF has text or tables pdfplumber can read (false for pure scan pages)."""
    import pdfplumber
    from io import BytesIO

    with pdfplumber.open(BytesIO(pdf_bytes)) as document:
        for page in document.pages[:5]:
            if page.chars:
                return True
            if page.extract_tables():
                return True
    return False


def parse_form20_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    import pdfplumber
    from io import BytesIO

    all_booths: list[dict[str, Any]] = []
    candidates: list[str] = []
    layout = "unknown"

    with pdfplumber.open(BytesIO(pdf_bytes)) as document:
        for page in document.pages:
            tables = page.extract_tables() or []
            for table in tables:
                if not table or len(table) < 2:
                    continue
                page_layout, page_candidates, page_booths = _parse_grid_table(table)
                if not page_booths:
                    continue
                layout = page_layout
                if page_candidates and (not candidates or len(page_candidates) >= len(candidates)):
                    candidates = page_candidates
                candidate_count = len(candidates)
                for booth in page_booths:
                    if len(booth["votes"]) < candidate_count:
                        booth["votes"] = booth["votes"] + [0] * (candidate_count - len(booth["votes"]))
                    elif len(booth["votes"]) > candidate_count:
                        booth["votes"] = booth["votes"][:candidate_count]
                    all_booths.append(booth)

    seen: set[int] = set()
    unique_booths: list[dict[str, Any]] = []
    for booth in sorted(all_booths, key=lambda item: item["polling_station_serial"]):
        serial = booth["polling_station_serial"]
        if serial in seen:
            continue
        seen.add(serial)
        unique_booths.append(booth)

    return {
        "layout": layout,
        "candidates": candidates,
        "booths": unique_booths,
        "booth_count": len(unique_booths),
    }
