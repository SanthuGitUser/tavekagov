import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type GovernmentOrdersViewMode = "calendar" | "department";

type GovernmentOrdersViewContextValue = {
  viewMode: GovernmentOrdersViewMode;
  setViewMode: (value: GovernmentOrdersViewMode) => void;
};

const GovernmentOrdersViewContext =
  createContext<GovernmentOrdersViewContextValue | null>(null);

export function GovernmentOrdersViewProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewMode] = useState<GovernmentOrdersViewMode>("calendar");
  const value = useMemo(() => ({ viewMode, setViewMode }), [viewMode]);

  return (
    <GovernmentOrdersViewContext.Provider value={value}>
      {children}
    </GovernmentOrdersViewContext.Provider>
  );
}

export function useGovernmentOrdersView() {
  return useContext(GovernmentOrdersViewContext);
}

