import { normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import { createLazyFeed, loadJsonModules } from "@/lib/lazyDailyJsonFeed";
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

const dailyJsonLoaders = import.meta.glob(
  "../../../TN-DVAC-Press-Release/Response-JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { import: "default" },
) as Record<string, () => Promise<DailyResponseFile>>;

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

function emptyFeed(): DvacPressReleaseFeedResponse {
  return {
    sourceUrl: "https://www.dvac.tn.gov.in/Press_Release.html",
    totalResults: 0,
    results: [],
  };
}

export let tamilNaduDvacPressReleaseFeed: DvacPressReleaseFeedResponse = emptyFeed();

async function buildFeedAsync(): Promise<DvacPressReleaseFeedResponse> {
  const releasesByUrl = new Map<string, DvacPressRelease>();
  let sourceUrl = "https://www.dvac.tn.gov.in/Press_Release.html";

  const sortedDailyFiles = await loadJsonModules<DailyResponseFile>(dailyJsonLoaders);

  for (const { file } of sortedDailyFiles) {
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

const lazyFeed = createLazyFeed({
  empty: emptyFeed,
  build: buildFeedAsync,
  isLoaded: (feed) => feed.results.length > 0,
  onLoaded: (feed) => {
    tamilNaduDvacPressReleaseFeed = feed;
  },
});

export function ensureTamilNaduDvacPressReleaseFeedLoaded(): Promise<DvacPressReleaseFeedResponse> {
  return lazyFeed.ensureLoaded();
}

export function resetTamilNaduDvacPressReleaseFeedCache(): void {
  lazyFeed.reset();
}

export function getAvailableDvacPressReleaseDates(): string[] {
  const dates = new Set(
    tamilNaduDvacPressReleaseFeed.results.map((release) => release.release_date),
  );
  return [...dates].sort().reverse();
}
