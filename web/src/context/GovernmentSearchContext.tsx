import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type GovernmentSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const GovernmentSearchContext = createContext<GovernmentSearchContextValue | null>(null);

export function GovernmentSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <GovernmentSearchContext.Provider value={value}>{children}</GovernmentSearchContext.Provider>
  );
}

export function useGovernmentSearch() {
  return useContext(GovernmentSearchContext);
}
