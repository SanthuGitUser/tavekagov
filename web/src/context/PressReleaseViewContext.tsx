import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";
import type { PressReleaseView } from "@/components/press-releases/pressReleaseUtils";

type PressReleaseViewContextValue = {
  viewMode: PressReleaseView;
  setViewMode: (value: PressReleaseView) => void;
  selectedDateRange: NewsDateRange;
  setSelectedDateRange: (value: NewsDateRange) => void;
  availableDates: string[];
  setAvailableDates: (value: string[]) => void;
  selectedDateReleaseCount: number;
  setSelectedDateReleaseCount: (value: number) => void;
  totalReleaseCount: number;
  setTotalReleaseCount: (value: number) => void;
};

const PressReleaseViewContext = createContext<PressReleaseViewContextValue | null>(null);

export function PressReleaseViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<PressReleaseView>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<NewsDateRange>({ from: "", to: "" });
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateReleaseCount, setSelectedDateReleaseCount] = useState(0);
  const [totalReleaseCount, setTotalReleaseCount] = useState(0);

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
      totalReleaseCount,
      setTotalReleaseCount,
    }),
    [viewMode, selectedDateRange, availableDates, selectedDateReleaseCount, totalReleaseCount],
  );

  return (
    <PressReleaseViewContext.Provider value={value}>
      {children}
    </PressReleaseViewContext.Provider>
  );
}

export function usePressReleaseView() {
  return useContext(PressReleaseViewContext);
}
