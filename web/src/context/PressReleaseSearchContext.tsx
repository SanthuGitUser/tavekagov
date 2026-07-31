import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PressReleaseSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const PressReleaseSearchContext = createContext<PressReleaseSearchContextValue | null>(
  null,
);

export function PressReleaseSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <PressReleaseSearchContext.Provider value={value}>
      {children}
    </PressReleaseSearchContext.Provider>
  );
}

export function usePressReleaseSearch() {
  return useContext(PressReleaseSearchContext);
}
