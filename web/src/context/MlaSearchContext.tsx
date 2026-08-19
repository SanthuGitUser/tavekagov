import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type MlaSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  partyFilter: string;
  setPartyFilter: (value: string) => void;
  criminalCasesFilter: string;
  setCriminalCasesFilter: (value: string) => void;
  educationFilter: string;
  setEducationFilter: (value: string) => void;
  assetsFilter: string;
  setAssetsFilter: (value: string) => void;
  liabilitiesFilter: string;
  setLiabilitiesFilter: (value: string) => void;
  districtFilter: string;
  setDistrictFilter: (value: string) => void;
  resetFilters: () => void;
};

const MlaSearchContext = createContext<MlaSearchContextValue | null>(null);

export function MlaSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("all");
  const [criminalCasesFilter, setCriminalCasesFilter] = useState("all");
  const [educationFilter, setEducationFilter] = useState("all");
  const [assetsFilter, setAssetsFilter] = useState("all");
  const [liabilitiesFilter, setLiabilitiesFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");

  const resetFilters = useCallback(() => {
    setSearch("");
    setPartyFilter("all");
    setCriminalCasesFilter("all");
    setEducationFilter("all");
    setAssetsFilter("all");
    setLiabilitiesFilter("all");
    setDistrictFilter("all");
  }, []);

  const value = useMemo(
    () => ({
      search,
      setSearch,
      partyFilter,
      setPartyFilter,
      criminalCasesFilter,
      setCriminalCasesFilter,
      educationFilter,
      setEducationFilter,
      assetsFilter,
      setAssetsFilter,
      liabilitiesFilter,
      setLiabilitiesFilter,
      districtFilter,
      setDistrictFilter,
      resetFilters,
    }),
    [
      search,
      partyFilter,
      criminalCasesFilter,
      educationFilter,
      assetsFilter,
      liabilitiesFilter,
      districtFilter,
      resetFilters,
    ],
  );

  return <MlaSearchContext.Provider value={value}>{children}</MlaSearchContext.Provider>;
}

export function useMlaSearch() {
  return useContext(MlaSearchContext);
}

