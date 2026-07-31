import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MinisterSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const MinisterSearchContext = createContext<MinisterSearchContextValue | null>(null);

export function MinisterSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <MinisterSearchContext.Provider value={value}>{children}</MinisterSearchContext.Provider>
  );
}

export function useMinisterSearch() {
  return useContext(MinisterSearchContext);
}
