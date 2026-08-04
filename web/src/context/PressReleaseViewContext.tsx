import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { PressReleaseView } from "@/components/press-releases/pressReleaseUtils";

type PressReleaseViewContextValue = {
  viewMode: PressReleaseView;
  setViewMode: (value: PressReleaseView) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
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
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateReleaseCount, setSelectedDateReleaseCount] = useState(0);
  const [totalReleaseCount, setTotalReleaseCount] = useState(0);

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
      totalReleaseCount,
      setTotalReleaseCount,
    }),
    [viewMode, selectedDate, availableDates, selectedDateReleaseCount, totalReleaseCount],
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
