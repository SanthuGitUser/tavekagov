import { createStateContext } from "@/context/createStateContext";

// Each page has its own context: the page header picks its controls by which
// context is present, so sharing one context showed the wrong controls.
const { Provider, useValue } = createStateContext("MagazineSearch", (): { search: string } => ({
  search: "",
}));

export const MagazineSearchProvider = Provider;
export const useMagazineSearch = useValue;
