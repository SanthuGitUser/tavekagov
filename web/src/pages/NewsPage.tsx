import { useEffect, useMemo, useState } from "react";

import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { NewsCategoryFilters } from "@/components/news/NewsCategoryFilters";
import { isDateInNewsRange } from "@/components/news/NewsDatePicker";
import { getNewsFilters, matchesNewsFilter } from "@/components/news/newsFilterUtils";
import { getLatestValidDate } from "@/components/shared/VerticalDatePicker";
import { useNewsSearch } from "@/context/NewsSearchContext";
import { getAvailableNewsDates, tamilNaduNewsFeed as feed } from "@/lib/tamilNaduNewsFeed";
import type { NewsArticle } from "@/types/news";

function getArticleDate(article: NewsArticle): string {
  const normalized = article.pubDate.includes("T")
    ? article.pubDate
    : article.pubDate.replace(" ", "T");
  return normalized.slice(0, 10);
}

function matchesSearch(article: NewsArticle, query: string): boolean {
  const haystack = [
    article.title,
    article.description,
    article.source_name,
    article.source_id,
    ...(article.keywords ?? []),
    ...(article.creator ?? []),
    ...article.category,
    ...article.country,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function NewsPage() {
  const newsSearch = useNewsSearch();
  const search = newsSearch?.search ?? "";
  const filterDateRange = newsSearch?.filterDateRange ?? {
    from: feed.filterDate,
    to: feed.filterDate,
  };
  const [activeCategory, setActiveCategory] = useState("all");

  const latestDate = useMemo(() => getLatestValidDate(getAvailableNewsDates()), []);

  useEffect(() => {
    if (!latestDate || !newsSearch) return;
    const { from, to } = newsSearch.filterDateRange;
    if (!from || !to) {
      newsSearch.setFilterDateRange({ from: latestDate, to: latestDate });
    }
  }, [latestDate, newsSearch]);

  const articlesForFilters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return feed.results.filter((article) => {
      const dateMatch = isDateInNewsRange(getArticleDate(article), filterDateRange);
      const searchMatch = !query || matchesSearch(article, query);
      return dateMatch && searchMatch;
    });
  }, [search, filterDateRange]);

  const filters = useMemo(() => getNewsFilters(articlesForFilters), [articlesForFilters]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return feed.results.filter((article) => {
      const dateMatch = isDateInNewsRange(getArticleDate(article), filterDateRange);
      const categoryMatch =
        activeCategory === "all" || matchesNewsFilter(article, activeCategory);
      const searchMatch = !query || matchesSearch(article, query);
      return dateMatch && categoryMatch && searchMatch;
    });
  }, [search, filterDateRange, activeCategory]);

  useEffect(() => {
    if (activeCategory !== "all" && !filters.some((filter) => filter.id === activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, filters]);

  useEffect(() => {
    newsSearch?.setArticleCounts(filtered.length, feed.totalResults);
  }, [filtered.length, newsSearch?.setArticleCounts]);

  if (feed.results.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No news articles found in the feed.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <NewsCategoryFilters
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        filters={filters}
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          No articles match your search, date, or category filter.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((article) => (
            <NewsArticleCard key={article.article_id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
