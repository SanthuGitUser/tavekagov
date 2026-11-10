import { describe, expect, it } from "vitest";

import { resolveDateRange } from "@/lib/dateRangeUtils";

const day = (d: string) => ({ from: d, to: d });

describe("resolveDateRange", () => {
  it("opens on the latest day when nothing is selected", () => {
    expect(resolveDateRange({ from: "", to: "" }, "2026-11-05", null)).toEqual(day("2026-11-05"));
  });

  it("keeps a past day the user picked", () => {
    const picked = day("2026-11-03");
    expect(resolveDateRange(picked, "2026-11-05", "2026-11-05")).toBe(picked);
    expect(resolveDateRange(picked, "2026-11-05", null)).toBe(picked);
  });

  it("follows new data when the user was on the latest day", () => {
    expect(resolveDateRange(day("2026-11-05"), "2026-11-06", "2026-11-05")).toEqual(day("2026-11-06"));
  });

  it("does not move a past day when new data arrives", () => {
    const picked = day("2026-11-03");
    expect(resolveDateRange(picked, "2026-11-06", "2026-11-05")).toBe(picked);
  });

  it("keeps multi-day ranges", () => {
    const range = { from: "2026-11-01", to: "2026-11-05" };
    expect(resolveDateRange(range, "2026-11-06", "2026-11-05")).toBe(range);
  });

  it("falls back to the latest day when the selected day has no data", () => {
    expect(
      resolveDateRange(day("2026-10-01"), "2026-11-05", "2026-11-05", ["2026-11-04", "2026-11-05"]),
    ).toEqual(day("2026-11-05"));
  });
});

describe("resolveDateRange default", () => {
  it("uses the page's default range when nothing is selected", () => {
    const fallback = { from: "2026-10-01", to: "2026-11-05" };
    expect(resolveDateRange({ from: "", to: "" }, "2026-11-05", null, undefined, fallback)).toBe(fallback);
  });
});
