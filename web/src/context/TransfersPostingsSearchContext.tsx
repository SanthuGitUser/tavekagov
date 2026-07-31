import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type TransfersPostingsSearchContextValue = {
  search: string;
  setSearch: (value: string) => void;
};

const TransfersPostingsSearchContext =
  createContext<TransfersPostingsSearchContextValue | null>(null);

export function TransfersPostingsSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  const value = useMemo(() => ({ search, setSearch }), [search]);

  return (
    <TransfersPostingsSearchContext.Provider value={value}>
      {children}
    </TransfersPostingsSearchContext.Provider>
  );
}

export function useTransfersPostingsSearch() {
  return useContext(TransfersPostingsSearchContext);
}
