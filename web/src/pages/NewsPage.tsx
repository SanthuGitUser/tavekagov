import { useEffect, useMemo, useState } from "react";

import { NewsStoryCard } from "@/components/news/NewsStoryCard";
import { NewsCategoryFilters } from "@/components/news/NewsCategoryFilters";
import { isDateInNewsRange } from "@/components/news/NewsDatePicker";
import {
  getStoryFilters,
  groupNewsArticles,
  storyMatchesCategory,
  storyMatchesSearch,
} from "@/components/news/newsGroupUtils";
import { getLatestValidDate } from "@/components/shared/VerticalDatePicker";
import { useNewsSearch } from "@/context/NewsSearchContext";
import { getArticleDateInIst } from "@/lib/newsDateUtils";
import { getAvailableNewsDates, tamilNaduNewsFeed as feed } from "@/lib/tamilNaduNewsFeed";
import type { NewsArticle } from "@/types/news";

function isArticleInDateRange(article: NewsArticle, from: string, to: string): boolean {
  return isDateInNewsRange(getArticleDateInIst(article), { from, to });
}

export function NewsPage() {
  const newsSearch = useNewsSearch();
  const search = newsSearch?.search ?? "";
  const filterDateRange = newsSearch?.filterDateRange ?? {
    from: feed.filterDate,
    to: feed.filterDate,
  };
  const [activeCategory, setActiveCategory] = useState("all");

  const allStoryGroups = useMemo(() => groupNewsArticles(feed.results), []);
  const latestDate = useMemo(() => getLatestValidDate(getAvailableNewsDates()), []);

  useEffect(() => {
    if (!latestDate || !newsSearch) return;
    const { from, to } = newsSearch.filterDateRange;
    if (!from || !to) {
      newsSearch.setFilterDateRange({ from: latestDate, to: latestDate });
    }
  }, [latestDate, newsSearch]);

  const groupsForFilters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allStoryGroups.filter((group) => {
      const dateMatch = group.sources.some((article) =>
        isArticleInDateRange(article, filterDateRange.from, filterDateRange.to),
      );
      const searchMatch = !query || storyMatchesSearch(group, query);
      return dateMatch && searchMatch;
    });
  }, [allStoryGroups, search, filterDateRange]);

  const filters = useMemo(() => getStoryFilters(groupsForFilters), [groupsForFilters]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allStoryGroups.filter((group) => {
      const dateMatch = group.sources.some((article) =>
        isArticleInDateRange(article, filterDateRange.from, filterDateRange.to),
      );
      const categoryMatch =
        activeCategory === "all" || storyMatchesCategory(group, activeCategory);
      const searchMatch = !query || storyMatchesSearch(group, query);
      return dateMatch && categoryMatch && searchMatch;
    });
  }, [allStoryGroups, search, filterDateRange, activeCategory]);

  useEffect(() => {
    if (activeCategory !== "all" && !filters.some((filter) => filter.id === activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, filters]);

  useEffect(() => {
    newsSearch?.setArticleCounts(filteredGroups.length, allStoryGroups.length);
  }, [filteredGroups.length, allStoryGroups.length, newsSearch?.setArticleCounts]);

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

      {filteredGroups.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
          No stories match your search, date, or category filter.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredGroups.map((group) => (
            <NewsStoryCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
