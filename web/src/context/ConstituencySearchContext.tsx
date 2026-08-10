import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

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
};

const ConstituencySearchContext = createContext<ConstituencySearchContextValue | null>(null);

export function ConstituencySearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");

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
    }),
    [search, districtFilter, partyFilter, categoryFilter, memberFilter],
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
