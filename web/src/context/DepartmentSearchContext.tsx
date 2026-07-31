import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type DepartmentSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const DepartmentSearchContext = createContext<DepartmentSearchContextValue | null>(null);

export function DepartmentSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <DepartmentSearchContext.Provider value={value}>
      {children}
    </DepartmentSearchContext.Provider>
  );
}

export function useDepartmentSearch() {
  return useContext(DepartmentSearchContext);
}
