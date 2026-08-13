import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type GovernmentSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const GovernmentSearchContext = createContext<GovernmentSearchContextValue | null>(null);

export function GovernmentSearchProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch("");
  }, [location.pathname]);

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <GovernmentSearchContext.Provider value={value}>{children}</GovernmentSearchContext.Provider>
  );
}

export function useGovernmentSearch() {
  return useContext(GovernmentSearchContext);
}
