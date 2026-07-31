import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type GovernmentOrdersSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const GovernmentOrdersSearchContext =
  createContext<GovernmentOrdersSearchContextValue | null>(null);

export function GovernmentOrdersSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <GovernmentOrdersSearchContext.Provider value={value}>
      {children}
    </GovernmentOrdersSearchContext.Provider>
  );
}

export function useGovernmentOrdersSearch() {
  return useContext(GovernmentOrdersSearchContext);
}
