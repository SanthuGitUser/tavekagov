import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type MagazineSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const MagazineSearchContext = createContext<MagazineSearchContextValue | null>(null);

export function MagazineSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <MagazineSearchContext.Provider value={value}>{children}</MagazineSearchContext.Provider>
  );
}

export function useMagazineSearch() {
  return useContext(MagazineSearchContext);
}
