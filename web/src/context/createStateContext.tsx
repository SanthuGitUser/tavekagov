import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Setters<S> = {
  [K in keyof S & string as `set${Capitalize<K>}`]: (value: S[K]) => void;
};

/** State fields, a `setX` for each field `x`, and `resetFilters` to restore the initial values. */
export type StateContextValue<S> = S & Setters<S> & { resetFilters: () => void };

function setterName(key: string): string {
  return `set${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

/**
 * Builds a React context that holds a flat bag of page state (search text, filters,
 * counts, view mode...). Replaces hand-written providers that declared one useState
 * per field plus a matching setter.
 *
 *   const { Provider, useValue } = createStateContext("MlaSearch", () => ({ search: "", partyFilter: "all" }));
 *   // useValue() -> { search, setSearch, partyFilter, setPartyFilter, resetFilters } | null
 *
 * `useValue` returns null outside the provider, like the providers it replaces.
 */
export function createStateContext<S extends Record<string, unknown>>(
  displayName: string,
  initialState: () => S,
) {
  const Context = createContext<StateContextValue<S> | null>(null);
  Context.displayName = displayName;

  function Provider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<S>(initialState);

    // Setters never change identity, so consumers can list them as effect deps safely.
    const actions = useMemo(() => {
      const setters: Record<string, (value: unknown) => void> = {};
      for (const key of Object.keys(initialState())) {
        setters[setterName(key)] = (value: unknown) =>
          setState((previous) =>
            Object.is(previous[key], value) ? previous : { ...previous, [key]: value },
          );
      }
      return {
        ...(setters as Setters<S>),
        resetFilters: () => setState(initialState()),
      };
    }, []);

    const value = useMemo(
      () => ({ ...state, ...actions }) as StateContextValue<S>,
      [state, actions],
    );

    return <Context.Provider value={value}>{children}</Context.Provider>;
  }

  function useValue(): StateContextValue<S> | null {
    return useContext(Context);
  }

  return { Provider, useValue };
}
