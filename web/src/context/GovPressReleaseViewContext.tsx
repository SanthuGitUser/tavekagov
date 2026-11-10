import { createStateContext } from "@/context/createStateContext";

import type {
  GovPressReleaseFlagFilter,
  GovPressReleaseView,
} from "@/components/gov-press-releases/govPressReleaseUtils";
import type { NewsDateRange } from "@/components/news/NewsDatePicker";

const { Provider, useValue } = createStateContext("GovPressReleaseView", (): {
  viewMode: GovPressReleaseView;
  selectedDateRange: NewsDateRange;
  availableDates: string[];
  selectedDateReleaseCount: number;
  categoryFilter: GovPressReleaseFlagFilter;
} => ({
  viewMode: "all",
  selectedDateRange: { from: "", to: "" },
  availableDates: [],
  selectedDateReleaseCount: 0,
  categoryFilter: "all",
}));

export const GovPressReleaseViewProvider = Provider;
export const useGovPressReleaseView = useValue;
