import { useEffect, useRef } from "react";

import { resolveDateRange, type DateRange } from "@/lib/dateRangeUtils";

/**
 * Keeps a page's selected date range sensible (see resolveDateRange) without
 * overriding days the user picks. Only reacts to a change in the latest day,
 * not to every change of the selection.
 */
export function useLatestDateRange(
  range: DateRange,
  setRange: ((range: DateRange) => void) | undefined,
  latestDate: string | null,
  validDates?: readonly string[],
  defaultRange?: DateRange,
): void {
  const previousLatest = useRef<string | null>(null);

  useEffect(() => {
    if (!latestDate || !setRange) return;
    const next = resolveDateRange(range, latestDate, previousLatest.current, validDates, defaultRange);
    previousLatest.current = latestDate;
    if (next.from !== range.from || next.to !== range.to) setRange(next);
  }, [range, setRange, latestDate, validDates, defaultRange]);
}
