import type { PressRelease } from "@/types/models";

const BASE_API_URL = "https://dipr.tn.gov.in/dipr_api/v1";
const PDF_SUFFIX_RE = /\.pdf\s*$/i;
const PR_NO_RE = /DIPR[-\s]*(?:P\.?\s*R\.?|PR)[_\s.-]*No\.?\s*[_\s.-]*(\d+)/i;

type RawPressReleaseItem = Record<string, unknown>;

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return url;
  }
}

function joinBaseApi(filePathOrUrl: string): string {
  const raw = filePathOrUrl.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return safeUrl(raw);
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return safeUrl(`${BASE_API_URL.replace(/\/$/, "")}${path}`);
}

function itemTitle(item: RawPressReleaseItem): string {
  const candidates = ["press_name", "press_note_name", "title", "name"] as const;
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Untitled";
}

function itemFileField(item: RawPressReleaseItem): string {
  for (const key of ["press_file_name", "press_note_file_name"] as const) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  for (const [key, value] of Object.entries(item)) {
    if (!key.endsWith("_file_name")) continue;
    if (typeof value === "string" && value.trim().toLowerCase().endsWith(".pdf")) {
      return value.trim();
    }
  }

  return "";
}

function extractPrNo(item: RawPressReleaseItem, name: string): string | null {
  const raw = item.press_release_no;
  if (typeof raw === "string" && raw.trim()) return raw.trim();

  for (const source of [name, itemFileField(item)]) {
    const match = PR_NO_RE.exec(source);
    if (match) return match[1] ?? null;
  }

  return null;
}

function emptyParsedFields(): Pick<
  PressRelease,
  | "release_type"
  | "department_name"
  | "topic"
  | "department_id"
  | "minister_id"
  | "name_parsed"
  | "parse_confidence"
  | "minister_match_confidence"
  | "created_at"
> {
  return {
    release_type: null,
    department_name: null,
    topic: null,
    department_id: null,
    minister_id: null,
    name_parsed: false,
    parse_confidence: null,
    minister_match_confidence: null,
    created_at: "",
  };
}

export function parseRawPressReleaseItem(item: RawPressReleaseItem): PressRelease | null {
  const itemId = item.id;
  if (itemId == null) return null;

  const fileRef = itemFileField(item);
  const pdfUrl = joinBaseApi(fileRef);
  if (!pdfUrl) return null;

  const rawName = itemTitle(item).replace(PDF_SUFFIX_RE, "").trim();
  const prDateRaw = item.pr_date ?? item.uploaded_date;
  if (typeof prDateRaw !== "string" || !prDateRaw.trim()) return null;

  const prDate = prDateRaw.trim().slice(0, 10);

  return {
    id: Number(itemId),
    name: rawName,
    pr_date: prDate,
    dipr_pr_no: extractPrNo(item, rawName),
    pdf_url: pdfUrl,
    ...emptyParsedFields(),
  };
}

export function parseRawPressReleaseItems(items: RawPressReleaseItem[]): PressRelease[] {
  const releases: PressRelease[] = [];

  for (const item of items) {
    const parsed = parseRawPressReleaseItem(item);
    if (parsed) releases.push(parsed);
  }

  return releases;
}
