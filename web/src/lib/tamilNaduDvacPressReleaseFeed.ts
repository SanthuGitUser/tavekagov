import { normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import type { DvacPressRelease } from "@/types/models";

type DailyResponseFile = {
  date?: string;
  source_url?: string;
  releases?: Record<string, unknown>[];
};

export type DvacPressReleaseFeedResponse = {
  totalResults: number;
  sourceUrl: string;
  results: DvacPressRelease[];
};

// One JSON file per release date: TN-DVAC-Press Release/Response JSON/YYYY-MM-DD.json
const dailyJsonFiles = import.meta.glob(
  "../../../TN-DVAC-Press Release/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { eager: true, import: "default" },
) as Record<string, DailyResponseFile>;

function parseRelease(raw: Record<string, unknown>): DvacPressRelease | null {
  const pdfUrl = typeof raw.pdf_url === "string" ? raw.pdf_url.trim() : "";
  const releaseDate = normalizeToIsoDate(raw.release_date);
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!pdfUrl || !releaseDate || !title) return null;

  const fileName = typeof raw.file_name === "string" ? raw.file_name : null;

  return {
    id: stableIdFromKey(pdfUrl),
    title,
    release_date: releaseDate,
    pdf_url: pdfUrl,
    file_name: fileName,
  };
}

function buildFeed(): DvacPressReleaseFeedResponse {
  const releasesByUrl = new Map<string, DvacPressRelease>();
  let sourceUrl = "https://www.dvac.tn.gov.in/Press_Release.html";

  const sortedDailyFiles = Object.entries(dailyJsonFiles).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  for (const [, file] of sortedDailyFiles) {
    sourceUrl = file.source_url ?? sourceUrl;
    for (const raw of file.releases ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const parsed = parseRelease(raw as Record<string, unknown>);
      if (!parsed) continue;
      releasesByUrl.set(parsed.pdf_url, parsed);
    }
  }

  const results = [...releasesByUrl.values()].sort((left, right) => {
    const dateDiff = right.release_date.localeCompare(left.release_date);
    if (dateDiff !== 0) return dateDiff;
    return left.title.localeCompare(right.title);
  });

  return {
    sourceUrl,
    totalResults: results.length,
    results,
  };
}

export const tamilNaduDvacPressReleaseFeed = buildFeed();

export function getAvailableDvacPressReleaseDates(): string[] {
  const dates = new Set(
    tamilNaduDvacPressReleaseFeed.results.map((release) => release.release_date),
  );
  return [...dates].sort().reverse();
}

