import { createStateContext } from "@/context/createStateContext";

// Each page has its own context: the page header picks its controls by which
// context is present, so sharing one context showed the wrong controls.
const { Provider, useValue } = createStateContext("GovPressReleaseSearch", (): { search: string } => ({
  search: "",
}));

export const GovPressReleaseSearchProvider = Provider;
export const useGovPressReleaseSearch = useValue;
