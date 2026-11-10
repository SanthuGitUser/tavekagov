import { createStateContext } from "@/context/createStateContext";

export type GovernmentOrdersViewMode = "calendar" | "department";

const { Provider, useValue } = createStateContext("GovernmentOrdersView", (): {
  viewMode: GovernmentOrdersViewMode;
  selectedDate: string;
  availableDates: string[];
  selectedDateOrderCount: number;
} => ({
  viewMode: "calendar",
  selectedDate: "",
  availableDates: [],
  selectedDateOrderCount: 0,
}));

export const GovernmentOrdersViewProvider = Provider;
export const useGovernmentOrdersView = useValue;
