import { format, parseISO, subDays } from "date-fns";

import { getArticleDateInIst } from "@/lib/newsDateUtils";
import type { NewsArticle } from "@/types/news";

export type DailyCategoryRow = {
  date: string;
  total: number;
  [category: string]: string | number;
};

export type NewsChartRange = "7d" | "30d" | "3m" | "6m";

export const NEWS_CHART_RANGE_OPTIONS: { value: NewsChartRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
];

export const NEWS_CHART_RANGE_DAYS: Record<NewsChartRange, number> = {
  "7d": 7,
  "30d": 30,
  "3m": 90,
  "6m": 180,
};

const CATEGORY_COLORS: Record<string, string> = {
  politics: "#2563eb",
  business: "#16a34a",
  sports: "#ca8a04",
  crime: "#dc2626",
  entertainment: "#db2777",
  technology: "#0891b2",
  health: "#7c3aed",
  education: "#ea580c",
  environment: "#059669",
  lifestyle: "#9333ea",
  world: "#475569",
  other: "#94a3b8",
  top: "#cbd5e1",
};

const FALLBACK_COLORS = [
  "#0ea5e9",
  "#84cc16",
  "#f43f5e",
  "#6366f1",
  "#14b8a6",
  "#f59e0b",
];

function getLatestArticleDate(articles: NewsArticle[]): string | null {
  const dates = articles.map(getArticleDateInIst).sort();
  return dates.at(-1) ?? null;
}

function getPrimaryCategory(article: NewsArticle): string {
  const normalized = article.category.map((value) => value.toLowerCase());
  return normalized.find((category) => category !== "top") ?? normalized[0] ?? "other";
}

function getDatesInRange(endDate: string, dayCount: number): string[] {
  const end = parseISO(endDate);
  return Array.from({ length: dayCount }, (_, index) =>
    format(subDays(end, dayCount - 1 - index), "yyyy-MM-dd"),
  );
}

export function getCategoryColor(category: string, index: number): string {
  const key = category.toLowerCase();
  return CATEGORY_COLORS[key] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function getDailyCategoryCounts(
  articles: NewsArticle[],
  options?: { range?: NewsChartRange },
): { chartData: DailyCategoryRow[]; categories: string[] } {
  const range = options?.range ?? "7d";
  const rangeDays = NEWS_CHART_RANGE_DAYS[range];
  const latestDate = getLatestArticleDate(articles);

  if (!latestDate) {
    return { chartData: [], categories: [] };
  }

  const rangeDates = getDatesInRange(latestDate, rangeDays);
  const rangeStart = rangeDates[0]!;
  const filteredArticles = articles.filter((article) => {
    const date = getArticleDateInIst(article);
    return date >= rangeStart && date <= latestDate;
  });

  const dailyCounts = new Map<string, Map<string, number>>();
  const categoryTotals = new Map<string, number>();

  for (const article of filteredArticles) {
    const date = getArticleDateInIst(article);
    const category = getPrimaryCategory(article);

    if (!dailyCounts.has(date)) {
      dailyCounts.set(date, new Map());
    }

    const dayMap = dailyCounts.get(date)!;
    dayMap.set(category, (dayMap.get(category) ?? 0) + 1);
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + 1);
  }

  const categories = [...categoryTotals.entries()]
    .sort((left, right) => {
      const countDiff = right[1] - left[1];
      if (countDiff !== 0) return countDiff;
      return left[0].localeCompare(right[0]);
    })
    .map(([category]) => category);

  const chartData = rangeDates.map((date) => {
    const categoryMap = dailyCounts.get(date);
    const row: DailyCategoryRow = { date, total: 0 };

    for (const category of categories) {
      const count = categoryMap?.get(category) ?? 0;
      row[category] = count;
      row.total += count;
    }

    return row;
  });

  return { chartData, categories };
}
