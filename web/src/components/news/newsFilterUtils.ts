import type { NewsArticle } from "@/types/news";

export type NewsFilter = {
  id: string;
  label: string;
  count: number;
};

export function matchesNewsFilter(article: NewsArticle, filterId: string): boolean {
  return article.category.some((category) => category.toLowerCase() === filterId.toLowerCase());
}

export function getNewsFilters(articles: NewsArticle[]): NewsFilter[] {
  const categoryCounts = new Map<string, number>();

  for (const article of articles) {
    for (const category of article.category) {
      const key = category.toLowerCase();
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }
  }

  return [...categoryCounts.entries()]
    .sort((a, b) => {
      const countDiff = b[1] - a[1];
      if (countDiff !== 0) return countDiff;
      return a[0].localeCompare(b[0]);
    })
    .map(([category, count]) => ({
      id: category,
      label: category,
      count,
    }));
}
