import type { NewsArticle, NewsFeedResponse } from "@/types/news";
import { getArticleDateInIst } from "@/lib/newsDateUtils";

type NewsResponseFile = {
  date?: string;
  fetchedAt?: string;
  lastFetchedAt?: string;
  fetchCount?: number;
  request?: {
    url?: string;
    params?: Record<string, string>;
  };
  response?: {
    status: string;
    totalResults: number;
    results: NewsArticle[];
  };
  status?: string;
  totalResults?: number;
  results?: NewsArticle[];
};

// One JSON file per publication day (IST): TN-News/Response JSON/YYYY-MM-DD.json
const responseJsonFiles = import.meta.glob(
  "../../../TN-News/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { eager: true, import: "default" },
) as Record<string, NewsResponseFile>;

function extractPublicationDateFromPath(path: string): string | null {
  const match = path.match(/(\d{4}-\d{2}-\d{2})\.json$/);
  return match?.[1] ?? null;
}

function extractResults(file: NewsResponseFile): NewsArticle[] {
  if (file.response?.results) return file.response.results;
  if (file.results) return file.results;
  return [];
}

function extractRequestMeta(file: NewsResponseFile): NewsResponseFile["request"] | undefined {
  return file.request;
}

function buildFeed(): NewsFeedResponse {
  const files = Object.entries(responseJsonFiles)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath));

  const seen = new Set<string>();
  const results: NewsArticle[] = [];
  let latestRequest: NewsResponseFile["request"];

  for (const [, file] of files) {
    latestRequest = extractRequestMeta(file) ?? latestRequest;

    for (const article of extractResults(file)) {
      const dedupeKey = article.article_id || article.link;
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push(article);
    }
  }

  results.sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  const articleDates = results.map(getArticleDateInIst).sort();
  const fileDates = files
    .map(([path]) => extractPublicationDateFromPath(path))
    .filter((value): value is string => Boolean(value))
    .sort();
  const filterDate = articleDates.at(-1) ?? fileDates.at(-1) ?? "";
  const params = latestRequest?.params ?? {};

  return {
    status: "success",
    totalResults: results.length,
    filterDate,
    sourceQuery: {
      endpoint: latestRequest?.url ?? "https://newsdata.io/api/1/news",
      q: params.q ?? "Tamil Nadu",
      country: params.country ?? "in",
      language: params.language ?? "en",
    },
    results,
  };
}

export const tamilNaduNewsFeed = buildFeed();

export function getAvailableNewsDates(): string[] {
  const dates = new Set<string>();

  for (const path of Object.keys(responseJsonFiles)) {
    const fileDate = extractPublicationDateFromPath(path);
    if (fileDate) dates.add(fileDate);
  }

  for (const article of tamilNaduNewsFeed.results) {
    dates.add(getArticleDateInIst(article));
  }

  return [...dates].sort().reverse();
}
