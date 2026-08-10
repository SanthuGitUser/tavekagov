import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { GovPressReleaseFlagFilter, GovPressReleaseView } from "@/components/gov-press-releases/govPressReleaseUtils";
import type { NewsDateRange } from "@/components/news/NewsDatePicker";

type GovPressReleaseViewContextValue = {
  viewMode: GovPressReleaseView;
  setViewMode: (value: GovPressReleaseView) => void;
  selectedDateRange: NewsDateRange;
  setSelectedDateRange: (value: NewsDateRange) => void;
  availableDates: string[];
  setAvailableDates: (value: string[]) => void;
  selectedDateReleaseCount: number;
  setSelectedDateReleaseCount: (value: number) => void;
  categoryFilter: GovPressReleaseFlagFilter;
  setCategoryFilter: (value: GovPressReleaseFlagFilter) => void;
};

const GovPressReleaseViewContext = createContext<GovPressReleaseViewContextValue | null>(null);

export function GovPressReleaseViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<GovPressReleaseView>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<NewsDateRange>({ from: "", to: "" });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateReleaseCount, setSelectedDateReleaseCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<GovPressReleaseFlagFilter>("all");

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      selectedDateRange,
      setSelectedDateRange,
      availableDates,
      setAvailableDates,
      selectedDateReleaseCount,
      setSelectedDateReleaseCount,
      categoryFilter,
      setCategoryFilter,
    }),
    [viewMode, selectedDateRange, availableDates, selectedDateReleaseCount, categoryFilter],
  );

  return (
    <GovPressReleaseViewContext.Provider value={value}>
      {children}
    </GovPressReleaseViewContext.Provider>
  );
}

export function useGovPressReleaseView() {
  return useContext(GovPressReleaseViewContext);
}
