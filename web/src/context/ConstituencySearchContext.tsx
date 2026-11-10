import { createStateContext } from "@/context/createStateContext";

const { Provider, useValue } = createStateContext("ConstituencySearch", (): {
  search: string;
  districtFilter: string;
  partyFilter: string;
  categoryFilter: string;
  memberFilter: string;
  selectedAcNumber: number | null;
} => ({
  search: "",
  districtFilter: "all",
  partyFilter: "all",
  categoryFilter: "all",
  memberFilter: "all",
  selectedAcNumber: null,
}));

export const ConstituencySearchProvider = Provider;
export const useConstituencySearch = useValue;
