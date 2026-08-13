import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";
import { getLatestNewsDate } from "@/lib/tamilNaduNewsFeed";

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

const initialDate = getLatestNewsDate();

export function NewsSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<NewsDateRange>({
    from: initialDate,
    to: initialDate,
  });
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

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
    [search, filterDateRange, filteredCount, totalCount, setArticleCounts],
  );

  return (
    <NewsSearchContext.Provider value={value}>{children}</NewsSearchContext.Provider>
  );
}

export function useNewsSearch() {
  return useContext(NewsSearchContext);
}
