import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type GovPressReleaseSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const GovPressReleaseSearchContext = createContext<GovPressReleaseSearchContextValue | null>(
  null,
);

export function GovPressReleaseSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <GovPressReleaseSearchContext.Provider value={value}>
      {children}
    </GovPressReleaseSearchContext.Provider>
  );
}

export function useGovPressReleaseSearch() {
  return useContext(GovPressReleaseSearchContext);
}
