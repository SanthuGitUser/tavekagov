import { enrichPressReleases } from "@/lib/pressReleaseNameParser";
import { parseRawPressReleaseItems } from "@/lib/pressReleaseParseUtils";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import type { PressRelease } from "@/types/models";

type PressReleaseResponseFile = {
  date?: string;
  fetchedAt?: string;
  lastFetchedAt?: string;
  fetchCount?: number;
  request?: {
    url?: string;
    params?: Record<string, string>;
  };
  response?: {
    success?: number;
    data?: Record<string, unknown>[];
  };
};

export type PressReleaseFeedResponse = {
  totalResults: number;
  filterDate: string;
  sourceUrl: string;
  results: PressRelease[];
};

// One JSON file per API date: TN-DIPR-Press Release/Response JSON/YYYY-MM-DD.json
const responseJsonFiles = import.meta.glob(
  "../../../TN-DIPR-Press Release/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { eager: true, import: "default" },
) as Record<string, PressReleaseResponseFile>;

const enrichmentContext = {
  departments: tamilNaduDepartmentsFeed.departments,
  ministers: tamilNaduMinistersFeed.ministers,
};

function extractRawItems(file: PressReleaseResponseFile): Record<string, unknown>[] {
  const data = file.response?.data;
  return Array.isArray(data) ? data : [];
}

function buildFeed(): PressReleaseFeedResponse {
  const files = Object.entries(responseJsonFiles)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .map(([, file]) => file);

  const seen = new Set<number>();
  const rawResults: PressRelease[] = [];
  let sourceUrl = "https://dipr.tn.gov.in/press-release1.html";

  for (const file of files) {
    sourceUrl = file.request?.url ?? sourceUrl;

    for (const release of parseRawPressReleaseItems(extractRawItems(file))) {
      if (seen.has(release.id)) continue;
      seen.add(release.id);
      rawResults.push(release);
    }
  }

  const results = enrichPressReleases(rawResults, enrichmentContext);

  results.sort((left, right) => {
    const dateDiff = right.pr_date.localeCompare(left.pr_date);
    if (dateDiff !== 0) return dateDiff;
    return right.id - left.id;
  });

  const dates = results.map((release) => release.pr_date).sort();

  return {
    totalResults: results.length,
    filterDate: dates.at(-1) ?? "",
    sourceUrl,
    results,
  };
}

export const tamilNaduPressReleaseFeed = buildFeed();

export function getAvailablePressReleaseDates(): string[] {
  const dates = new Set(tamilNaduPressReleaseFeed.results.map((release) => release.pr_date));
  return [...dates].sort().reverse();
}

export function getMonthlyPressReleaseCounts(): { month: string; press: number }[] {
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  const sinceIso = since.toISOString().slice(0, 10);

  return getMonthlyPressReleaseCountsForRange({ from: sinceIso, to: "9999-12-31" });
}

export function getMonthlyPressReleaseCountsForRange(
  dateRange: { from: string; to: string } | null,
): { month: string; press: number }[] {
  const from = dateRange?.from ?? "0000-01-01";
  const to = dateRange?.to ?? "9999-12-31";

  const bucket = new Map<string, number>();

  for (const release of tamilNaduPressReleaseFeed.results) {
    if (release.pr_date < from || release.pr_date > to) continue;
    const month = release.pr_date.slice(0, 7);
    bucket.set(month, (bucket.get(month) ?? 0) + 1);
  }

  return [...bucket.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, press]) => ({ month, press }));
}

export function getRecentPressReleases(limit = 8): PressRelease[] {
  return getRecentPressReleasesForRange(limit, null);
}

export function getRecentPressReleasesForRange(
  limit: number,
  dateRange: { from: string; to: string } | null,
): PressRelease[] {
  const from = dateRange?.from ?? "0000-01-01";
  const to = dateRange?.to ?? "9999-12-31";
  return tamilNaduPressReleaseFeed.results
    .filter((release) => release.pr_date >= from && release.pr_date <= to)
    .slice(0, limit);
}
