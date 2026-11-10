import { createStateContext } from "@/context/createStateContext";

const { Provider, useValue } = createStateContext("DvacPressReleaseSearch", (): {
  search: string;
  selectedMonth: string;
  availableMonths: string[];
  filteredCount: number;
  totalCount: number;
} => ({
  search: "",
  selectedMonth: "",
  availableMonths: [],
  filteredCount: 0,
  totalCount: 0,
}));

export const DvacPressReleaseSearchProvider = Provider;
export const useDvacPressReleaseSearch = useValue;
