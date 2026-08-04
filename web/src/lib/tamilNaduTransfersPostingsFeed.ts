import { mergeUniqueByKey, normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import type { TnTransferOfficer, TnTransfersPosting, TnTransfersPostingRow } from "@/types/models";

type DailyResponseFile = {
  source_url?: string;
  postings?: Record<string, unknown>[];
};

const dailyJsonFiles = import.meta.glob(
  "../../../TN-IAS_Transfers-Postings/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { eager: true, import: "default" },
) as Record<string, DailyResponseFile>;

function parseOfficer(raw: unknown): TnTransferOfficer | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const details = typeof record.details === "string" ? record.details.trim() : "";
  const oldPost = typeof record.old_post === "string" ? record.old_post.trim() : "";
  const newPost = typeof record.new_post === "string" ? record.new_post.trim() : "";
  const confidence =
    typeof record.confidence === "number" && Number.isFinite(record.confidence)
      ? record.confidence
      : undefined;
  if (!name && !details && !oldPost && !newPost) return null;
  return { name, details, old_post: oldPost, new_post: newPost, confidence };
}

function parsePosting(raw: Record<string, unknown>): TnTransfersPosting | null {
  const pdfUrl = typeof raw.pdf_url === "string" ? raw.pdf_url.trim() : "";
  const goDate = normalizeToIsoDate(raw.go_date);
  const goNumber = typeof raw.go_number === "string" ? raw.go_number.trim() : "";
  const subject = typeof raw.subject === "string" ? raw.subject : "";
  const serialNumber = Number(raw.serial_number);
  if (!pdfUrl || !goDate || !goNumber || Number.isNaN(serialNumber)) return null;

  const officers = Array.isArray(raw.officers)
    ? raw.officers
        .map((entry) => parseOfficer(entry))
        .filter((officer): officer is TnTransferOfficer => officer !== null)
    : [];
  const parseStatus =
    typeof raw.parse_status === "string" && raw.parse_status.trim()
      ? raw.parse_status.trim()
      : undefined;

  return {
    id: stableIdFromKey(pdfUrl),
    serial_number: serialNumber,
    go_date: goDate,
    go_number: goNumber,
    subject,
    pdf_url: pdfUrl,
    officers,
    parse_status: parseStatus,
  };
}

function collectRawPostings(): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();

  for (const file of Object.values(dailyJsonFiles)) {
    if (!Array.isArray(file.postings)) continue;
    for (const raw of file.postings) {
      const parsed = parsePosting(raw);
      if (!parsed) continue;
      byKey.set(parsed.pdf_url, raw);
    }
  }

  return [...byKey.values()];
}

function buildFeed() {
  const postings = mergeUniqueByKey(
    collectRawPostings()
      .map((raw) => parsePosting(raw))
      .filter((posting): posting is TnTransfersPosting => posting !== null),
    (posting) => posting.pdf_url,
  );

  postings.sort((left, right) => {
    const dateDiff = right.go_date.localeCompare(left.go_date);
    if (dateDiff !== 0) return dateDiff;
    return left.serial_number - right.serial_number;
  });

  const sourceUrl =
    Object.values(dailyJsonFiles)[0]?.source_url ??
    "https://tnsectdemo.tn.gov.in/ias/transferandpostings.php";

  return {
    sourceUrl,
    totalResults: postings.length,
    postings,
  };
}

export const tamilNaduTransfersPostingsFeed = buildFeed();

export function getTransfersPostings(): TnTransfersPosting[] {
  return tamilNaduTransfersPostingsFeed.postings;
}

export function expandTransferPostingRows(
  postings: TnTransfersPosting[],
): TnTransfersPostingRow[] {
  const rows: TnTransfersPostingRow[] = [];

  for (const posting of postings) {
    if (posting.officers.length === 0) {
      rows.push({
        ...posting,
        row_id: `${posting.id}-0`,
        officer_name: "",
        details: "",
        old_post: "",
        new_post: "",
        confidence: undefined,
      });
      continue;
    }

    posting.officers.forEach((officer, index) => {
      rows.push({
        ...posting,
        row_id: `${posting.id}-${index}`,
        officer_name: officer.name,
        details: officer.details,
        old_post: officer.old_post,
        new_post: officer.new_post,
        confidence: officer.confidence,
      });
    });
  }

  return rows;
}

export function getAvailableTransfersPostingDates(): string[] {
  const dates = new Set(
    tamilNaduTransfersPostingsFeed.postings.map((posting) => posting.go_date),
  );
  return [...dates].sort((a, b) => b.localeCompare(a));
}

export function getDefaultTransfersPostingDateRange(dates: string[]): { from: string; to: string } {
  if (dates.length === 0) return { from: "", to: "" };

  const latest = dates[0];
  const monthPrefix = latest.slice(0, 7);
  const year = Number(monthPrefix.slice(0, 4));
  const month = Number(monthPrefix.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();

  return {
    from: `${monthPrefix}-01`,
    to: `${monthPrefix}-${String(lastDay).padStart(2, "0")}`,
  };
}
