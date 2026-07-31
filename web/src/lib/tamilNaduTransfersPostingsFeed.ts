import { mergeUniqueByKey, normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import type { TnTransfersPosting } from "@/types/models";

type DailyResponseFile = {
  source_url?: string;
  postings?: Record<string, unknown>[];
};

const dailyJsonFiles = import.meta.glob(
  "../../../TN-IAS_Transfers-Postings/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { eager: true, import: "default" },
) as Record<string, DailyResponseFile>;

function parsePosting(raw: Record<string, unknown>): TnTransfersPosting | null {
  const pdfUrl = typeof raw.pdf_url === "string" ? raw.pdf_url.trim() : "";
  const goDate = normalizeToIsoDate(raw.go_date);
  const goNumber = typeof raw.go_number === "string" ? raw.go_number.trim() : "";
  const subject = typeof raw.subject === "string" ? raw.subject : "";
  const serialNumber = Number(raw.serial_number);
  if (!pdfUrl || !goDate || !goNumber || Number.isNaN(serialNumber)) return null;

  return {
    id: stableIdFromKey(pdfUrl),
    serial_number: serialNumber,
    go_date: goDate,
    go_number: goNumber,
    subject,
    pdf_url: pdfUrl,
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
