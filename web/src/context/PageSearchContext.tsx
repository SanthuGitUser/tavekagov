import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PageSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const PageSearchContext = createContext<PageSearchContextValue | null>(null);

export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>;
}

export function usePageSearch(): PageSearchContextValue | null {
  return useContext(PageSearchContext);
}
