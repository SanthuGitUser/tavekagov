import argparse
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import quote, unquote, urlsplit, urlunsplit

import requests


BASE_API_URL = "https://dipr.tn.gov.in/dipr_api/v1"
START_PAGE_URL = "https://dipr.tn.gov.in/press-release1.html"

DEFAULT_WORKERS = 10


def _safe_url(url: str) -> str:
    parts = urlsplit(url)
    path = quote(unquote(parts.path), safe="/-_.~()")
    query = quote(unquote(parts.query), safe="=&-_.~%")
    return urlunsplit((parts.scheme, parts.netloc, path, query, parts.fragment))


def _join_base_api(file_path_or_url: str) -> str:
    raw = (file_path_or_url or "").strip()
    if not raw:
        return ""
    if raw.lower().startswith("http://") or raw.lower().startswith("https://"):
        return _safe_url(raw)
    if not raw.startswith("/"):
        raw = "/" + raw
    return _safe_url(BASE_API_URL.rstrip("/") + raw)


_BAD_WIN_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_SPACE_RE = re.compile(r"\s+")
_PDF_SUFFIX_RE = re.compile(r"\.pdf\s*$", re.I)


def _sanitize_filename(name: str, max_len: int = 180) -> str:
    n = (name or "").strip()
    n = _PDF_SUFFIX_RE.sub("", n).strip()
    n = _BAD_WIN_CHARS_RE.sub(" ", n)
    # Keep filenames broadly portable (avoid console / legacy encoding issues)
    n = re.sub(r"[^\x20-\x7E]", " ", n)
    n = _SPACE_RE.sub(" ", n).strip(" .")
    if not n:
        n = "file"
    if len(n) > max_len:
        n = n[:max_len].rstrip(" .")
    return n


def _ensure_unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem = path.stem
    suffix = path.suffix
    parent = path.parent
    for i in range(1, 10_000):
        p = parent / f"{stem}_{i}{suffix}"
        if not p.exists():
            return p
    raise RuntimeError(f"Could not find unique filename for: {path}")


def _fetch_api_list(sess: requests.Session, endpoint: str, selected_date: str) -> dict[str, Any]:
    url = f"{BASE_API_URL}/general/pressReleases/{endpoint}"
    params = {"date": selected_date} if selected_date else {}
    r = sess.get(url, params=params, timeout=(20, 120))
    r.raise_for_status()
    return r.json()


def _extract_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        return []
    if payload.get("success") != 1:
        return []
    data = payload.get("data")
    if not isinstance(data, list):
        return []
    out: list[dict[str, Any]] = []
    for it in data:
        if isinstance(it, dict):
            out.append(it)
    return out


def _item_title(it: dict[str, Any]) -> str:
    return (
        it.get("press_name")
        or it.get("press_note_name")
        or it.get("title")
        or it.get("name")
        or "Untitled"
    )


def _item_id(it: dict[str, Any]) -> str:
    v = it.get("id")
    if v is None:
        return "0"
    return str(v)


def _item_file_field(it: dict[str, Any]) -> str:
    # Most common keys used by the site JS:
    for k in ("press_file_name", "press_note_file_name"):
        v = it.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    # Fallback: any *_file_name that looks like a PDF
    for k, v in it.items():
        if not isinstance(k, str) or not k.endswith("_file_name"):
            continue
        if isinstance(v, str) and v.strip().lower().endswith(".pdf"):
            return v.strip()
    return ""


def _download_one(
    sess: requests.Session,
    url: str,
    out_path: Path,
) -> Path:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if out_path.exists():
        try:
            if out_path.stat().st_size > 0:
                return out_path
            out_path.unlink()
        except Exception:
            pass
    with sess.get(url, timeout=(20, 180), stream=True) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 256):
                if chunk:
                    f.write(chunk)
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Download TN DIPR press release PDFs for a selected date."
    )
    ap.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="Date in ISO format (YYYY-MM-DD). Default: today.",
    )
    ap.add_argument(
        "--out",
        default=str(Path(__file__).parent),
        help="Output directory root. Default: this folder.",
    )
    ap.add_argument(
        "--include-notes",
        action="store_true",
        help="Also download the 'Press Notes' tab PDFs.",
    )
    ap.add_argument(
        "--workers",
        type=int,
        default=DEFAULT_WORKERS,
        help=f"Concurrent downloads. Default: {DEFAULT_WORKERS}.",
    )
    args = ap.parse_args()

    selected_date: str = args.date.strip()
    out_root = Path(args.out).resolve()
    day_root = out_root / selected_date

    endpoints: list[tuple[str, str]] = [("Press Release", "press_release")]
    if args.include_notes:
        endpoints.append(("Press Notes", "press_notes"))

    sess = requests.Session()
    sess.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/126 Safari/537.36"
            ),
            "Referer": START_PAGE_URL,
            "X-App-Key": "dipr",
            "X-App-Name": "dipr",
        }
    )

    manifests_dir = out_root / "manifests"
    manifests_dir.mkdir(parents=True, exist_ok=True)

    to_download: list[tuple[str, Path]] = []
    manifest: dict[str, Any] = {
        "date": selected_date,
        "base_api_url": BASE_API_URL,
        "download_root": str(day_root),
        "endpoints": {},
    }

    for label, endpoint in endpoints:
        payload = _fetch_api_list(sess, endpoint, selected_date)
        manifest["endpoints"][endpoint] = payload
        items = _extract_items(payload)
        sub_dir = day_root / label

        for it in items:
            file_ref = _item_file_field(it)
            file_url = _join_base_api(file_ref)
            if not file_url:
                continue

            title = _PDF_SUFFIX_RE.sub("", _item_title(it)).strip()
            item_id = _item_id(it)
            base_name = _sanitize_filename(f"{title} - {item_id}")
            preferred_path = sub_dir / f"{base_name}.pdf"
            # Back-compat: if a prior run saved this ID under a slightly different title
            # (e.g., press_name included ".pdf"), reuse the existing file path so we
            # don't create duplicates on disk.
            existing_for_id = list(sub_dir.glob(f"* - {item_id}.pdf"))
            out_path = existing_for_id[0] if existing_for_id else preferred_path
            to_download.append((file_url, out_path))

    manifest_path = manifests_dir / f"press_release_{selected_date}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    if not to_download:
        print(f"No PDFs found for {selected_date}. (Manifest: {manifest_path})")
        return 0

    # De-duplicate by URL while keeping first output path.
    seen_urls: set[str] = set()
    unique_jobs: list[tuple[str, Path]] = []
    for u, p in to_download:
        if u in seen_urls:
            continue
        seen_urls.add(u)
        unique_jobs.append((u, p))

    print(f"Found {len(unique_jobs)} PDFs for {selected_date}. Downloading to: {day_root}")

    ok, fail = 0, 0
    os.makedirs(day_root, exist_ok=True)

    def worker(job: tuple[str, Path]) -> Path:
        u, p = job
        return _download_one(sess, u, p)

    with ThreadPoolExecutor(max_workers=max(1, int(args.workers))) as ex:
        futs = {ex.submit(worker, job): job for job in unique_jobs}
        for fut in as_completed(futs):
            u, p = futs[fut]
            try:
                saved = fut.result()
                ok += 1
                print(f"[OK] {saved}")
            except Exception as e:
                fail += 1
                print(f"[FAIL] {u} -> {e}")

    print(f"Done. Downloaded={ok}, Failed={fail}. Manifest: {manifest_path}")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())

