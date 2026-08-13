import type { NewsArticle, NewsFeedResponse, NewsSourceQuery } from "@/types/news";
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
const responseJsonLoaders = import.meta.glob(
  "../../../TN-News/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { import: "default" },
) as Record<string, () => Promise<NewsResponseFile>>;

const dateToLoader = new Map<string, () => Promise<NewsResponseFile>>();

for (const [path, loader] of Object.entries(responseJsonLoaders)) {
  const date = extractPublicationDateFromPath(path);
  if (date) dateToLoader.set(date, loader);
}

const availableNewsDates = [...dateToLoader.keys()].sort().reverse();
const articlesByDateCache = new Map<string, NewsArticle[]>();
let latestSourceQuery: NewsSourceQuery | null = null;

function extractPublicationDateFromPath(path: string): string | null {
  const match = path.match(/(\d{4}-\d{2}-\d{2})\.json$/);
  return match?.[1] ?? null;
}

function extractResults(file: NewsResponseFile): NewsArticle[] {
  if (file.response?.results) return file.response.results;
  if (file.results) return file.results;
  return [];
}

function extractSourceQuery(file: NewsResponseFile): NewsSourceQuery | null {
  const params = file.request?.params ?? {};
  return {
    endpoint: file.request?.url ?? "https://newsdata.io/api/1/news",
    q: params.q ?? "Tamil Nadu",
    country: params.country ?? "in",
    language: params.language ?? "en",
  };
}

function normalizeDateRange(from: string, to: string): { from: string; to: string } {
  return from <= to ? { from, to } : { from: to, to: from };
}

function isDateInRange(date: string, from: string, to: string): boolean {
  const range = normalizeDateRange(from, to);
  return date >= range.from && date <= range.to;
}

function getDatesInRange(from: string, to: string): string[] {
  const range = normalizeDateRange(from, to);
  return availableNewsDates.filter(
    (date) => date >= range.from && date <= range.to,
  );
}

async function loadArticlesForDate(date: string): Promise<NewsArticle[]> {
  const cached = articlesByDateCache.get(date);
  if (cached) return cached;

  const loader = dateToLoader.get(date);
  if (!loader) {
    articlesByDateCache.set(date, []);
    return [];
  }

  const file = await loader();
  latestSourceQuery = extractSourceQuery(file) ?? latestSourceQuery;
  const articles = extractResults(file);
  articlesByDateCache.set(date, articles);
  return articles;
}

export function getAvailableNewsDates(): string[] {
  return availableNewsDates;
}

export function getLatestNewsDate(): string {
  return availableNewsDates[0] ?? "";
}

export async function loadNewsArticlesForDateRange(
  from: string,
  to: string,
): Promise<NewsArticle[]> {
  if (!from || !to) return [];

  const dates = getDatesInRange(from, to);
  const batches = await Promise.all(dates.map((date) => loadArticlesForDate(date)));
  const seen = new Set<string>();
  const results: NewsArticle[] = [];

  for (const articles of batches) {
    for (const article of articles) {
      const articleDate = getArticleDateInIst(article);
      if (!isDateInRange(articleDate, from, to)) continue;

      const dedupeKey = article.article_id || article.link;
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push(article);
    }
  }

  results.sort((left, right) => right.pubDate.localeCompare(left.pubDate));
  return results;
}

export function getTamilNaduNewsFeedMeta(): Pick<
  NewsFeedResponse,
  "status" | "filterDate" | "sourceQuery"
> {
  return {
    status: "success",
    filterDate: getLatestNewsDate(),
    sourceQuery: latestSourceQuery ?? {
      endpoint: "https://newsdata.io/api/1/news",
      q: "Tamil Nadu",
      country: "in",
      language: "en",
    },
  };
}
