import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type DvacPressReleaseSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  selectedMonth: string;
  setSelectedMonth: (value: string) => void;
  availableMonths: string[];
  setAvailableMonths: (value: string[]) => void;
  filteredCount: number;
  setFilteredCount: (value: number) => void;
  totalCount: number;
  setTotalCount: (value: number) => void;
};

const DvacPressReleaseSearchContext = createContext<DvacPressReleaseSearchContextValue | null>(
  null,
);

export function DvacPressReleaseSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      selectedMonth,
      setSelectedMonth,
      availableMonths,
      setAvailableMonths,
      filteredCount,
      setFilteredCount,
      totalCount,
      setTotalCount,
    }),
    [search, selectedMonth, availableMonths, filteredCount, totalCount],
  );

  return (
    <DvacPressReleaseSearchContext.Provider value={value}>
      {children}
    </DvacPressReleaseSearchContext.Provider>
  );
}

export function useDvacPressReleaseSearch() {
  return useContext(DvacPressReleaseSearchContext);
}

