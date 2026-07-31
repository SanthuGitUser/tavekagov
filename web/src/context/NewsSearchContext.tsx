import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";
import { tamilNaduNewsFeed as feed } from "@/lib/tamilNaduNewsFeed";

type NewsSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  filterDateRange: NewsDateRange;
  setFilterDateRange: (value: NewsDateRange) => void;
  filteredCount: number;
  totalCount: number;
  setArticleCounts: (filtered: number, total: number) => void;
};

const NewsSearchContext = createContext<NewsSearchContextValue | null>(null);

const initialDate = feed.filterDate;

export function NewsSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<NewsDateRange>({
    from: initialDate,
    to: initialDate,
  });
  const [filteredCount, setFilteredCount] = useState(feed.totalResults);
  const [totalCount, setTotalCount] = useState(feed.totalResults);

  const setArticleCounts = useCallback((filtered: number, total: number) => {
    setFilteredCount(filtered);
    setTotalCount(total);
  }, []);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      filterDateRange,
      setFilterDateRange,
      filteredCount,
      totalCount,
      setArticleCounts,
    }),
    [search, filterDateRange, filteredCount, totalCount],
  );

  return (
    <NewsSearchContext.Provider value={value}>{children}</NewsSearchContext.Provider>
  );
}

export function useNewsSearch() {
  return useContext(NewsSearchContext);
}
