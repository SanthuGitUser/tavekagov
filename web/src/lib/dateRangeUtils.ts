export type DateRange = { from: string; to: string };

/**
 * Decides which date range a date-browsing page should show.
 *
 * - No range yet: open on `defaultRange`, or the latest day.
 * - New data arrived (latest day moved forward) while the user was on the old
 *   latest day: follow it to the new latest day.
 * - The selected day is not in the list of valid days: fall back to the latest day.
 * - Otherwise keep what the user picked, including any past day.
 */
export function resolveDateRange(
  range: DateRange,
  latestDate: string | null,
  previousLatestDate: string | null,
  validDates?: readonly string[],
  defaultRange?: DateRange,
): DateRange {
  if (!latestDate) return range;
  const latest = { from: latestDate, to: latestDate };
  if (!range.from || !range.to) return defaultRange ?? latest;
  if (
    previousLatestDate
    && previousLatestDate < latestDate
    && range.from === previousLatestDate
    && range.to === previousLatestDate
  ) {
    return latest;
  }
  if (validDates && validDates.length > 0 && !validDates.includes(range.from)) return latest;
  return range;
}
