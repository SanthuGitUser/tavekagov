import { useEffect, useMemo, useState, useTransition } from "react";

import { NewsStoryCard } from "@/components/news/NewsStoryCard";
import { NewsCategoryFilters } from "@/components/news/NewsCategoryFilters";
import {
  getStoryFilters,
  groupNewsArticles,
  storyMatchesCategory,
  storyMatchesSearch,
} from "@/components/news/newsGroupUtils";
import { PageLoading } from "@/components/shared/PageLoading";
import { getLatestValidDate } from "@/components/shared/VerticalDatePicker";
import { useNewsSearch } from "@/context/NewsSearchContext";
import {
  getAvailableNewsDates,
  getLatestNewsDate,
  loadNewsArticlesForDateRange,
} from "@/lib/tamilNaduNewsFeed";
import type { NewsArticle } from "@/types/news";

export function NewsPage() {
  const newsSearch = useNewsSearch();
  const search = newsSearch?.search ?? "";
  const setFilterDateRange = newsSearch?.setFilterDateRange;
  const setArticleCounts = newsSearch?.setArticleCounts;
  const filterDateRange = newsSearch?.filterDateRange ?? {
    from: getLatestNewsDate(),
    to: getLatestNewsDate(),
  };
  const [activeCategory, setActiveCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [, startTransition] = useTransition();

  const availableDates = useMemo(() => getAvailableNewsDates(), []);
  const latestDate = useMemo(() => getLatestValidDate(availableDates), [availableDates]);

  useEffect(() => {
    if (!latestDate || !setFilterDateRange) return;
    const { from, to } = filterDateRange;
    if (!from || !to) {
      setFilterDateRange({ from: latestDate, to: latestDate });
    }
  }, [latestDate, setFilterDateRange, filterDateRange.from, filterDateRange.to]);

  useEffect(() => {
    const { from, to } = filterDateRange;
    if (!from || !to) {
      setArticles([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    loadNewsArticlesForDateRange(from, to)
      .then((loaded) => {
        if (cancelled) return;
        startTransition(() => {
          setArticles(loaded);
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error("Failed to load news articles:", error);
        setArticles([]);
        setLoadError("Unable to load news for the selected date range.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filterDateRange.from, filterDateRange.to]);

  const storyGroups = useMemo(() => groupNewsArticles(articles), [articles]);

  const query = search.trim().toLowerCase();

  const groupsForFilters = useMemo(() => {
    if (!query) return storyGroups;
    return storyGroups.filter((group) => storyMatchesSearch(group, query));
  }, [storyGroups, query]);

  const filters = useMemo(() => getStoryFilters(groupsForFilters), [groupsForFilters]);

  const filteredGroups = useMemo(() => {
    return groupsForFilters.filter((group) => {
      const categoryMatch =
        activeCategory === "all" || storyMatchesCategory(group, activeCategory);
      return categoryMatch;
    });
  }, [groupsForFilters, activeCategory]);

  useEffect(() => {
    if (activeCategory !== "all" && !filters.some((filter) => filter.id === activeCategory)) {
      setActiveCategory("all");
    }
  }, [activeCategory, filters]);

  useEffect(() => {
    setArticleCounts?.(filteredGroups.length, storyGroups.length);
  }, [filteredGroups.length, storyGroups.length, setArticleCounts]);

  if (availableDates.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No news articles found in the feed.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 pb-3">
        <NewsCategoryFilters
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          filters={filters}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <PageLoading label="Loading news…" />
        ) : loadError ? (
          <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            {loadError}
          </p>
        ) : filteredGroups.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            No stories match your search, date, or category filter.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredGroups.map((group) => (
              <NewsStoryCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
