import { createStateContext } from "@/context/createStateContext";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";
import type { PressReleaseView } from "@/components/press-releases/pressReleaseUtils";

const { Provider, useValue } = createStateContext("PressReleaseView", (): {
  viewMode: PressReleaseView;
  selectedDateRange: NewsDateRange;
  availableDates: string[];
  selectedDateReleaseCount: number;
  totalReleaseCount: number;
} => ({
  viewMode: "all",
  selectedDateRange: { from: "", to: "" },
  availableDates: [],
  selectedDateReleaseCount: 0,
  totalReleaseCount: 0,
}));

export const PressReleaseViewProvider = Provider;
export const usePressReleaseView = useValue;
