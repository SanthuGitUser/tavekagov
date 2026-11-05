/**
 * When the user is browsing a single day and newer JSON lands in the repo,
 * move the picker to the latest available day (IST, not future-dated).
 */
export function shouldSnapSingleDayRangeToLatest(
  range: { from: string; to: string },
  latestDate: string | null,
): boolean {
  if (!latestDate || !range.from || !range.to) return false;
  if (range.from !== range.to) return false;
  return range.to < latestDate;
}

export function snapSingleDayRangeToLatest(
  range: { from: string; to: string },
  latestDate: string | null,
): { from: string; to: string } {
  if (!shouldSnapSingleDayRangeToLatest(range, latestDate) || !latestDate) {
    return range;
  }
  return { from: latestDate, to: latestDate };
}
