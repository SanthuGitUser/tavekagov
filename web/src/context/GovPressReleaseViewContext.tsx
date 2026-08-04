import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type {
  GovPressReleaseFlagFilter,
  GovPressReleaseView,
} from "@/components/gov-press-releases/govPressReleaseUtils";

type GovPressReleaseViewContextValue = {
  viewMode: GovPressReleaseView;
  setViewMode: (value: GovPressReleaseView) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
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
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateReleaseCount, setSelectedDateReleaseCount] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<GovPressReleaseFlagFilter>("all");

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      selectedDate,
      setSelectedDate,
      availableDates,
      setAvailableDates,
      selectedDateReleaseCount,
      setSelectedDateReleaseCount,
      categoryFilter,
      setCategoryFilter,
    }),
    [viewMode, selectedDate, availableDates, selectedDateReleaseCount, categoryFilter],
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
