import { createStateContext } from "@/context/createStateContext";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";

const { Provider, useValue } = createStateContext("GovernmentOrdersSearch", (): {
  search: string;
  filterDateRange: NewsDateRange;
  availableDates: string[];
  filteredCount: number;
  totalCount: number;
} => ({
  search: "",
  filterDateRange: { from: "", to: "" },
  availableDates: [],
  filteredCount: 0,
  totalCount: 0,
}));

export const GovernmentOrdersSearchProvider = Provider;
export const useGovernmentOrdersSearch = useValue;
