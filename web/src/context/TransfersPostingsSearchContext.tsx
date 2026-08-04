import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";

type TransfersPostingsSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  filterDateRange: NewsDateRange;
  setFilterDateRange: (value: NewsDateRange) => void;
  availableDates: string[];
  setAvailableDates: (value: string[]) => void;
  filteredCount: number;
  setFilteredCount: (value: number) => void;
  totalCount: number;
  setTotalCount: (value: number) => void;
};

const TransfersPostingsSearchContext =
  createContext<TransfersPostingsSearchContextValue | null>(null);

export function TransfersPostingsSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [filterDateRange, setFilterDateRange] = useState<NewsDateRange>({ from: "", to: "" });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      filterDateRange,
      setFilterDateRange,
      availableDates,
      setAvailableDates,
      filteredCount,
      setFilteredCount,
      totalCount,
      setTotalCount,
    }),
    [search, filterDateRange, availableDates, filteredCount, totalCount],
  );

  return (
    <TransfersPostingsSearchContext.Provider value={value}>
      {children}
    </TransfersPostingsSearchContext.Provider>
  );
}

export function useTransfersPostingsSearch() {
  return useContext(TransfersPostingsSearchContext);
}
