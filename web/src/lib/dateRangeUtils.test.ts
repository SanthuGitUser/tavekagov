import { describe, expect, it } from "vitest";

import {
  shouldSnapSingleDayRangeToLatest,
  snapSingleDayRangeToLatest,
} from "@/lib/dateRangeUtils";

describe("dateRangeUtils", () => {
  it("snaps when single day is behind latest", () => {
    expect(
      shouldSnapSingleDayRangeToLatest({ from: "2026-11-03", to: "2026-11-03" }, "2026-11-05"),
    ).toBe(true);
    expect(
      snapSingleDayRangeToLatest({ from: "2026-11-03", to: "2026-11-03" }, "2026-11-05"),
    ).toEqual({ from: "2026-11-05", to: "2026-11-05" });
  });

  it("does not snap multi-day ranges", () => {
    expect(
      shouldSnapSingleDayRangeToLatest({ from: "2026-11-01", to: "2026-11-03" }, "2026-11-05"),
    ).toBe(false);
  });
});
