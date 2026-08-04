import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type GovernmentOrdersViewMode = "calendar" | "department";

type GovernmentOrdersViewContextValue = {
  viewMode: GovernmentOrdersViewMode;
  setViewMode: (value: GovernmentOrdersViewMode) => void;
  selectedDate: string;
  setSelectedDate: (value: string) => void;
  availableDates: string[];
  setAvailableDates: (value: string[]) => void;
  selectedDateOrderCount: number;
  setSelectedDateOrderCount: (value: number) => void;
};

const GovernmentOrdersViewContext =
  createContext<GovernmentOrdersViewContextValue | null>(null);

export function GovernmentOrdersViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<GovernmentOrdersViewMode>("calendar");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDateOrderCount, setSelectedDateOrderCount] = useState(0);

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      selectedDate,
      setSelectedDate,
      availableDates,
      setAvailableDates,
      selectedDateOrderCount,
      setSelectedDateOrderCount,
    }),
    [viewMode, selectedDate, availableDates, selectedDateOrderCount],
  );

  return (
    <GovernmentOrdersViewContext.Provider value={value}>
      {children}
    </GovernmentOrdersViewContext.Provider>
  );
}

export function useGovernmentOrdersView() {
  return useContext(GovernmentOrdersViewContext);
}
