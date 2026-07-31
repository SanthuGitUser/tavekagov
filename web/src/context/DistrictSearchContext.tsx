import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type DistrictSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const DistrictSearchContext = createContext<DistrictSearchContextValue | null>(null);

export function DistrictSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <DistrictSearchContext.Provider value={value}>
      {children}
    </DistrictSearchContext.Provider>
  );
}

export function useDistrictSearch() {
  return useContext(DistrictSearchContext);
}
