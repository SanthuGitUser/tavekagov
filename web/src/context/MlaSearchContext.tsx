import { createStateContext } from "@/context/createStateContext";

const { Provider, useValue } = createStateContext("MlaSearch", (): {
  search: string;
  partyFilter: string;
  criminalCasesFilter: string;
  educationFilter: string;
  assetsFilter: string;
  liabilitiesFilter: string;
  districtFilter: string;
} => ({
  search: "",
  partyFilter: "all",
  criminalCasesFilter: "all",
  educationFilter: "all",
  assetsFilter: "all",
  liabilitiesFilter: "all",
  districtFilter: "all",
}));

export const MlaSearchProvider = Provider;
export const useMlaSearch = useValue;
