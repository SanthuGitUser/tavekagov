import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type TVKManifestoSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const TVKManifestoSearchContext = createContext<TVKManifestoSearchContextValue | null>(null);

export function TVKManifestoSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <TVKManifestoSearchContext.Provider value={value}>{children}</TVKManifestoSearchContext.Provider>
  );
}

export function useTVKManifestoSearch() {
  return useContext(TVKManifestoSearchContext);
}
