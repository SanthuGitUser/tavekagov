import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ConstituencySearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  districtFilter: string;
  setDistrictFilter: (value: string) => void;
  partyFilter: string;
  setPartyFilter: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  memberFilter: string;
  setMemberFilter: (value: string) => void;
  selectedAcNumber: number | null;
  setSelectedAcNumber: (value: number | null) => void;
  resetFilters: () => void;
};

const ConstituencySearchContext = createContext<ConstituencySearchContextValue | null>(null);

export function ConstituencySearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [selectedAcNumber, setSelectedAcNumber] = useState<number | null>(null);

  const resetFilters = useCallback(() => {
    setSearch("");
    setDistrictFilter("all");
    setPartyFilter("all");
    setCategoryFilter("all");
    setMemberFilter("all");
    setSelectedAcNumber(null);
  }, []);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      districtFilter,
      setDistrictFilter,
      partyFilter,
      setPartyFilter,
      categoryFilter,
      setCategoryFilter,
      memberFilter,
      setMemberFilter,
      selectedAcNumber,
      setSelectedAcNumber,
      resetFilters,
    }),
    [search, districtFilter, partyFilter, categoryFilter, memberFilter, selectedAcNumber, resetFilters],
  );

  return (
    <ConstituencySearchContext.Provider value={value}>
      {children}
    </ConstituencySearchContext.Provider>
  );
}

export function useConstituencySearch() {
  return useContext(ConstituencySearchContext);
}
