import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type GovtSchemeSectionFilter = "state" | "housing" | "scholarships";

type GovtSchemesSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
  sectionFilter: GovtSchemeSectionFilter;
  setSectionFilter: (value: GovtSchemeSectionFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
};

const GovtSchemesSearchContext = createContext<GovtSchemesSearchContextValue | null>(null);

export function GovtSchemesSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<GovtSchemeSectionFilter>("state");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const value = useMemo(
    () => ({
      search,
      setSearch,
      sectionFilter,
      setSectionFilter: (value: GovtSchemeSectionFilter) => {
        setSectionFilter(value);
        setCategoryFilter("all");
      },
      categoryFilter,
      setCategoryFilter,
    }),
    [search, sectionFilter, categoryFilter],
  );

  return (
    <GovtSchemesSearchContext.Provider value={value}>{children}</GovtSchemesSearchContext.Provider>
  );
}

export function useGovtSchemesSearch() {
  return useContext(GovtSchemesSearchContext);
}
