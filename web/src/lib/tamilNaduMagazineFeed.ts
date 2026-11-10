import { mergeUniqueByKey, stableIdFromKey } from "@/lib/jsonFeedUtils";
import { createLazyFeed, loadJsonModules } from "@/lib/lazyDailyJsonFeed";
import type { Magazine } from "@/types/models";

import magazineManifest from "../../../TN-TVA-Magazine/manifests/magazine.json";

type DailyResponseFile = {
  source_url?: string;
  magazines?: Record<string, unknown>[];
};

type MagazineManifest = {
  source_url?: string;
  count?: number;
  magazines: Magazine[];
};

const dailyJsonLoaders = import.meta.glob(
  "../../../TN-TVA-Magazine/Response-JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { import: "default" },
) as Record<string, () => Promise<DailyResponseFile>>;

const manifest = magazineManifest as MagazineManifest;

function parseMagazine(raw: Record<string, unknown>): Magazine | null {
  const id = Number(raw.id);
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const issueDate = typeof raw.issue_date === "string" ? raw.issue_date.trim() : "";
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!name || !issueDate || !url || Number.isNaN(id)) return null;

  return {
    id: id || stableIdFromKey(url),
    name,
    issue_date: issueDate,
    url,
  };
}

function collectRawMagazines(dailyFiles: DailyResponseFile[]): Record<string, unknown>[] {
  const byId = new Map<string, Record<string, unknown>>();

  for (const file of Object.values(manifest.magazines ?? [])) {
    const parsed = parseMagazine(file as unknown as Record<string, unknown>);
    if (parsed) byId.set(String(parsed.id), file as unknown as Record<string, unknown>);
  }

  for (const file of dailyFiles) {
    if (!Array.isArray(file.magazines)) continue;
    for (const raw of file.magazines) {
      const parsed = parseMagazine(raw);
      if (!parsed) continue;
      byId.set(String(parsed.id), raw);
    }
  }

  return [...byId.values()];
}

type MagazineFeed = {
  sourceUrl: string;
  totalResults: number;
  magazines: Magazine[];
};

function emptyFeed(): MagazineFeed {
  return {
    sourceUrl: "https://tamildigitallibrary.in/book-search-new?sub_cat_id=36&cat_id=21",
    totalResults: 0,
    magazines: [],
  };
}

export let tamilNaduMagazineFeed: MagazineFeed = emptyFeed();

async function buildFeedAsync(): Promise<MagazineFeed> {
  const loaded = await loadJsonModules<DailyResponseFile>(dailyJsonLoaders);
  const dailyFiles = loaded.map((entry) => entry.file);

  const magazines = mergeUniqueByKey(
    collectRawMagazines(dailyFiles)
      .map((raw) => parseMagazine(raw))
      .filter((magazine): magazine is Magazine => magazine !== null),
    (magazine) => String(magazine.id),
  );

  magazines.sort((left, right) => right.issue_date.localeCompare(left.issue_date));

  const sourceUrl =
    dailyFiles.at(-1)?.source_url ??
    manifest.source_url ??
    "https://tamildigitallibrary.in/book-search-new?sub_cat_id=36&cat_id=21";

  return {
    sourceUrl,
    totalResults: magazines.length,
    magazines,
  };
}

const lazyFeed = createLazyFeed({
  empty: emptyFeed,
  build: buildFeedAsync,
  isLoaded: (feed) => feed.magazines.length > 0,
  onLoaded: (feed) => {
    tamilNaduMagazineFeed = feed;
  },
});

export function ensureTamilNaduMagazineFeedLoaded(): Promise<MagazineFeed> {
  return lazyFeed.ensureLoaded();
}

export function resetTamilNaduMagazineFeedCache(): void {
  lazyFeed.reset();
}

export function getMagazines(): Magazine[] {
  return tamilNaduMagazineFeed.magazines.map((magazine) => ({
    ...magazine,
    created_at: magazine.created_at ?? "",
    updated_at: magazine.updated_at ?? "",
  }));
}
