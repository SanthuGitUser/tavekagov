"""
Extract officer name, old post, and new post from IAS transfer G.O. PDFs.

PDFs on tnsectdemo.tn.gov.in are often scanned images. Text is extracted with PyMuPDF
when a text layer exists, otherwise via Tesseract OCR.
"""

from __future__ import annotations

import io
import os
import re
import shutil
from dataclasses import dataclass
from typing import Iterable

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    fitz = None  # type: ignore[assignment]

try:
    import pytesseract
    from PIL import Image
except ImportError:  # pragma: no cover
    pytesseract = None  # type: ignore[assignment]
    Image = None  # type: ignore[assignment,misc]

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore[assignment]

try:
    from paddleocr import PaddleOCR
except ImportError:  # pragma: no cover
    PaddleOCR = None  # type: ignore[assignment]


_PADDLE_OCR: PaddleOCR | None = None


def _get_paddle_ocr() -> PaddleOCR | None:
    global _PADDLE_OCR
    if _PADDLE_OCR is not None:
        return _PADDLE_OCR
    if PaddleOCR is None:
        return None
    _PADDLE_OCR = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _PADDLE_OCR


if pytesseract is not None:
    # Ensure Tesseract is discoverable on Windows even when not in PATH.
    for candidate in (
        shutil.which("tesseract"),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ):
        if candidate and os.path.exists(candidate):
            pytesseract.pytesseract.tesseract_cmd = candidate
            break


# Be conservative: OCR noise can create false "Ms ..." matches inside "terms ...".
# Require the first letter of the name to be uppercase to reduce false positives.
_TITLE_PREFIX = r"(?:Tmt\.?|Thiru\.?|Smt\.?|Dr\.?|Selvi\.?)"
_NAME_PART = r"(?:(?:[A-Z]\.)+\s*)?[A-Z][A-Za-z.'\s-]*"
_NAME = rf"{_TITLE_PREFIX}\s+{_NAME_PART}"
_WHITESPACE_RE = re.compile(r"\s+")
_ROMAN_MARKER_RE = re.compile(r"\(\s*[ivxlcdm]+\s*\)", re.I)
_IAS_NAME_RE = re.compile(rf"({_NAME}),\s*IAS", re.I)
_ITEM_MARKER_RE = re.compile(r"^\s*\(\s*[ivxlcdm]+\s*\)\s*", re.I)
_ITEM_NUMBER_RE = re.compile(r"^\s*\d+\.\s*")

_ACTION_RE = re.compile(
    r"\b(?:is|are)\s+(?:transferred|posted|placed)\b|\btransferred\s+and\s+posted\b|\bposted\s+as\b|\bplaced\s+at\s+the\s+disposal\b",
    re.I,
)

_ORDER_MARKERS = (
    "following transfers and postings are notified",
    "following transfers are notified",
    "transfers and postings are notified",
    "the following transfers and postings",
)


@dataclass(frozen=True)
class TransferOfficer:
    name: str
    details: str
    old_post: str
    new_post: str
    confidence: float


def _clean_field(value: str) -> str:
    text = _WHITESPACE_RE.sub(" ", (value or "").strip())
    text = text.strip(" ,;:-.")
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s+", ", ", text)
    return text


def _normalize_pdf_text(text: str) -> str:
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    return _WHITESPACE_RE.sub(" ", text)


def _find_body_line_range(lines: list[str]) -> tuple[int, int]:
    lowered = [line.lower() for line in lines]
    start = 0
    for idx, line in enumerate(lowered):
        if any(marker in line for marker in _ORDER_MARKERS):
            start = idx + 1
            break
    else:
        for idx, line in enumerate(lowered):
            if re.search(r"\border\s*:-?\s*", line, flags=re.I):
                start = idx + 1
                break

    end = len(lines)
    for idx in range(start, len(lines)):
        if re.search(r"\(\s*by\s+order\s+of\s+(?:the\s+)?governor\s*\)", lines[idx], flags=re.I):
            end = idx
            break
        if re.search(r"\bthe\s+terms\s+and\s+conditions\s+of\s+deputation\b", lines[idx], flags=re.I):
            end = idx
            break
    return start, end


def _normalize_line(line: str) -> str:
    return _clean_field(line)


def _strip_item_prefix(text: str) -> str:
    text = _ITEM_MARKER_RE.sub("", text)
    text = _ITEM_NUMBER_RE.sub("", text)
    return text.strip()

def _clean_details(value: str) -> str:
    text = _clean_field(value)
    text = re.sub(r"\bvice\s*$", "", text, flags=re.I).strip(" ,;:-.")
    text = re.sub(r";\s*and\s*$", "", text, flags=re.I).strip(" ,;:-.")
    return _clean_field(text)


def _has_action(text: str) -> bool:
    return bool(_ACTION_RE.search(text))


def _build_item_blocks(lines: list[str]) -> list[str]:
    """
    Build item blocks from layout-preserved lines, using (i)/(ii)/... or numbered markers.
    This avoids fragile ';' splitting in OCR text.
    """
    start, end = _find_body_line_range(lines)
    body_lines = [_normalize_line(line) for line in lines[start:end] if _normalize_line(line)]
    if not body_lines:
        return []

    blocks: list[list[str]] = []
    current: list[str] = []
    saw_marker = False

    for line in body_lines:
        if _ITEM_MARKER_RE.match(line) or _ITEM_NUMBER_RE.match(line):
            saw_marker = True
            if current:
                blocks.append(current)
            current = [line]
        else:
            current.append(line)

    if current:
        blocks.append(current)

    if not saw_marker:
        blocks = []
        current = []
        for line in body_lines:
            if _IAS_NAME_RE.search(line) and current:
                blocks.append(current)
                current = [line]
            else:
                current.append(line)
        if current:
            blocks.append(current)

    return [_strip_item_prefix(_clean_field(" ".join(block))) for block in blocks if block]


def _repair_scrambled_transfer_phrases(text: str) -> str:
    text = re.sub(
        r"\bis\s+(?P<new>.+?)\s+vice\s+transferred\s+and\s+as\s+",
        r"is transferred and posted as \g<new> vice ",
        text,
        flags=re.I,
    )
    text = re.sub(
        r"transferred\s+and\s+as\s+District\b",
        "transferred and posted as District Collector,",
        text,
        flags=re.I,
    )
    return text


def _trim_order_footer(body: str) -> str:
    for pattern in (
        r"\(\s*by\s+order\s+of\s+(?:the\s+)?governor\s*\)",
        r"\bunder\s+rule\s+\d+\(1\)\s+of\s+the\s+ias\s+\(pay\)\s+rules",
        r"\bthe\s+terms\s+and\s+conditions\s+of\s+deputation\b",
        r"\bcontd\.\.\.",
    ):
        stop = re.search(pattern, body, flags=re.I)
        if stop:
            body = body[: stop.start()]
    return body.strip()


def _find_order_body(text: str) -> str:
    lowered = text.lower()
    for marker in _ORDER_MARKERS:
        idx = lowered.find(marker)
        if idx >= 0:
            return _trim_order_footer(text[idx + len(marker) :])

    # Fallback: attempt to start after "ORDER" if present.
    match = re.search(r"\border\s*:-?\s*", text, flags=re.I)
    if match:
        return _trim_order_footer(text[match.end() :])

    return _trim_order_footer(text)


def _extract_name(clause: str) -> str | None:
    match = _IAS_NAME_RE.search(clause)
    if match:
        return _clean_field(match.group(1))
    return None


def _extract_old_post(clause: str, name: str) -> str:
    # Most common form: "<Name>, IAS, <old>, is transferred ..."
    pattern = re.compile(
        rf"{re.escape(name)},\s*IAS,\s*(.+?)(?:\s+is\s+transferred|\s+are\s+transferred|\s+is\s+placed|\s+are\s+placed|\s+has\s+been\s+transferred)",
        re.I,
    )
    match = pattern.search(clause)
    if match:
        return _clean_field(match.group(1))

    # Services form: "The services of <Name>, IAS, <old>, are placed ..."
    pattern = re.compile(
        rf"services\s+of\s+{re.escape(name)},\s*IAS,\s*(.+?)(?:\s+are\s+placed|\s+is\s+placed)",
        re.I,
    )
    match = pattern.search(clause)
    if match:
        return _clean_field(match.group(1))

    return ""


def _extract_new_post(clause: str) -> str:
    for pattern in (
        r"(?:transferred\s+and\s+)?posted\s+as\s+(.+?)(?:\s+vice\b|\s+in\s+the\s+place\b|\s*;\s*|$)",
        r"transferred\s+and\s+posted\s+as\s+cum\s+(.+?)(?:\s+vice\b|\s+in\s+the\s+place\b|\s*;\s*|$)",
        r"placed\s+at\s+the\s+disposal\s+of\s+(.+?)(?:\s+for\s+appointment\s+as\s+its\s+(.+?))?(?:\s+vice\b|\s*;\s*|$)",
    ):
        match = re.search(pattern, clause, flags=re.I)
        if match:
            if match.lastindex and match.lastindex >= 2 and match.group(2):
                return _clean_field(f"{match.group(1)} for appointment as {match.group(2)}")
            return _clean_field(match.group(1))
    return ""


def _compute_confidence(*, name: str, details: str, old_post: str, new_post: str) -> float:
    score = 0.1
    if name:
        score += 0.2
    if old_post:
        score += 0.35
    if new_post:
        score += 0.35
    lowered = details.lower()
    if "already transferred" in lowered:
        score -= 0.1
    if len(old_post) > 250:
        score -= 0.2
    if len(new_post) > 250:
        score -= 0.2
    return max(0.0, min(1.0, score))


def _split_block_into_segments(block: str) -> list[str]:
    matches = list(_IAS_NAME_RE.finditer(block))
    if not matches:
        return []
    segments: list[str] = []
    for idx, match in enumerate(matches):
        start = match.start()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(block)
        segment = _clean_field(block[start:end])
        if segment:
            segments.append(segment)
    return segments


def parse_transfer_officers(text: str) -> list[TransferOfficer]:
    normalized = _repair_scrambled_transfer_phrases(_normalize_pdf_text(text))
    order_body = _find_order_body(normalized)
    blocks = [_clean_field(part) for part in re.split(r"\n+", order_body) if part.strip()]
    return parse_transfer_officers_from_blocks(blocks)


def parse_transfer_officers_from_blocks(blocks: Iterable[str]) -> list[TransferOfficer]:
    officers: list[TransferOfficer] = []
    seen: set[tuple[str, str, str, str]] = set()

    for block in blocks:
        segments = _split_block_into_segments(block) or [block]
        for segment in segments:
            name = _extract_name(segment) or _extract_name(block)
            if not name:
                continue
            details = _clean_details(segment)
            old_post = _extract_old_post(segment, name)
            new_post = _extract_new_post(segment)
            # Drop segments that look like "..., IAS; and" or footer noise.
            # Keep only real transfer/posting actions or segments with at least one field extracted.
            if not _has_action(details) and not (old_post or new_post):
                continue
            confidence = _compute_confidence(
                name=name,
                details=details,
                old_post=old_post,
                new_post=new_post,
            )
            key = (name.lower(), details.lower(), old_post.lower(), new_post.lower())
            if key in seen:
                continue
            seen.add(key)
            officers.append(
                TransferOfficer(
                    name=name,
                    details=details,
                    old_post=old_post,
                    new_post=new_post,
                    confidence=confidence,
                )
            )

    return officers


def parse_transfer_officers_from_lines(lines: list[str]) -> list[TransferOfficer]:
    blocks = _build_item_blocks(lines)
    if blocks:
        return parse_transfer_officers_from_blocks(blocks)
    # Fallback: no detectable blocks, try raw text parsing.
    return parse_transfer_officers(" ".join(lines))


def _words_to_lines(
    words: list[tuple[float, float, float, float, str, int, int, int]],
) -> list[str]:
    by_key: dict[tuple[int, int], list[tuple[int, float, str]]] = {}
    for x0, y0, _x1, _y1, w, block_no, line_no, word_no in words:
        by_key.setdefault((block_no, line_no), []).append((word_no, x0, w))
    lines: list[tuple[int, int, str]] = []
    for (block_no, line_no), items in by_key.items():
        items.sort(key=lambda t: (t[0], t[1]))
        text = " ".join(token for _wn, _x, token in items)
        text = _normalize_line(text)
        if text:
            lines.append((block_no, line_no, text))
    lines.sort(key=lambda t: (t[0], t[1]))
    return [t[2] for t in lines]


def _paddle_ocr_lines(image: "Image.Image") -> list[str]:
    ocr = _get_paddle_ocr()
    if ocr is None or np is None:
        return []
    arr = np.array(image.convert("RGB"))
    result = ocr.ocr(arr, cls=True)  # type: ignore[no-any-return]
    if not result or not result[0]:
        return []

    items: list[tuple[float, float, float, str]] = []
    for entry in result[0]:
        box, (text, _conf) = entry
        xs = [pt[0] for pt in box]
        ys = [pt[1] for pt in box]
        x = min(xs)
        y = sum(ys) / len(ys)
        h = max(ys) - min(ys)
        items.append((y, x, h, str(text)))
    items.sort(key=lambda t: (t[0], t[1]))

    lines: list[str] = []
    current: list[str] = []
    current_y: float | None = None
    current_h: float = 14.0
    for y, _x, h, text in items:
        text = _normalize_line(text)
        if not text:
            continue
        if current_y is None or abs(y - current_y) <= max(12.0, current_h * 0.8):
            current.append(text)
            current_y = y if current_y is None else min(current_y, y)
            current_h = max(current_h, h)
            continue
        lines.append(_normalize_line(" ".join(current)))
        current = [text]
        current_y = y
        current_h = h
    if current:
        lines.append(_normalize_line(" ".join(current)))

    return [line for line in lines if line]


def _page_text_from_ocr(page: "fitz.Page") -> str:
    if pytesseract is None or Image is None:
        return ""

    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    image = Image.open(io.BytesIO(pix.tobytes("png")))
    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

    words: list[tuple[int, int, str]] = []
    for index, raw in enumerate(data["text"]):
        token = (raw or "").strip()
        if not token:
            continue
        try:
            confidence = float(data["conf"][index])
        except (TypeError, ValueError):
            confidence = -1
        if confidence >= 0 and confidence < 30:
            continue
        words.append((int(data["top"][index]), int(data["left"][index]), token))

    words.sort(key=lambda item: (item[0] // 12, item[1]))

    lines: list[str] = []
    current: list[str] = []
    current_y: int | None = None
    for top, _left, token in words:
        if current_y is None or abs(top - current_y) <= 14:
            current.append(token)
            current_y = top if current_y is None else min(current_y, top)
            continue
        lines.append(" ".join(current))
        current = [token]
        current_y = top
    if current:
        lines.append(" ".join(current))

    return "\n".join(lines)


def extract_pdf_text(pdf_bytes: bytes) -> tuple[str, str]:
    """
    Return (text, extraction_method) where method is 'text', 'ocr', or 'none'.
    """
    if fitz is None:
        return "", "none"

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts: list[str] = []
    used_ocr = False

    for page in doc:
        page_text = page.get_text("text").strip()
        if page_text:
            text_parts.append(page_text)
            continue
        ocr_text = _page_text_from_ocr(page).strip()
        if ocr_text:
            text_parts.append(ocr_text)
            used_ocr = True

    if not text_parts:
        return "", "none"

    return "\n".join(text_parts), "ocr" if used_ocr else "text"


def extract_pdf_lines(pdf_bytes: bytes) -> tuple[list[str], str]:
    if fitz is None:
        return [], "none"

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_lines: list[str] = []
    used_ocr = False

    for page in doc:
        words = page.get_text("words")
        if words:
            all_lines.extend(_words_to_lines(words))
            continue

        if Image is None:
            continue

        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        image = Image.open(io.BytesIO(pix.tobytes("png")))

        paddle_lines = _paddle_ocr_lines(image)
        if paddle_lines:
            all_lines.extend(paddle_lines)
            used_ocr = True
            continue

        ocr_text = _page_text_from_ocr(page).strip()
        if ocr_text:
            all_lines.extend(
                [_normalize_line(line) for line in ocr_text.splitlines() if _normalize_line(line)]
            )
            used_ocr = True

    return [line for line in all_lines if line], "ocr" if used_ocr else "text"


def parse_transfer_pdf(pdf_bytes: bytes) -> tuple[list[TransferOfficer], str]:
    """
    Parse a transfer G.O. PDF.

    Returns (officers, parse_status) where parse_status is one of:
    ok, no_text, no_officers, unsupported
    """
    if fitz is None:
        return [], "unsupported"

    lines, method = extract_pdf_lines(pdf_bytes)
    if method == "none" or not lines:
        return [], "no_text"

    officers = parse_transfer_officers_from_lines(lines)
    if officers:
        return officers, "ok"
    return [], "no_officers"

