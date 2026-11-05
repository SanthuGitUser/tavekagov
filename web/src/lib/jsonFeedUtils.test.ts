import { describe, expect, it } from "vitest";

import { mergeUniqueByKey, normalizeToIsoDate } from "@/lib/jsonFeedUtils";

describe("normalizeToIsoDate", () => {
  it("passes through ISO dates", () => {
    expect(normalizeToIsoDate("2026-07-30")).toBe("2026-07-30");
  });

  it("parses DD-MM-YYYY", () => {
    expect(normalizeToIsoDate("30-07-2026")).toBe("2026-07-30");
  });
});

describe("mergeUniqueByKey", () => {
  it("dedupes by key", () => {
    const merged = mergeUniqueByKey(
      [
        { id: "a", v: 1 },
        { id: "a", v: 2 },
        { id: "b", v: 3 },
      ],
      (item) => item.id,
    );
    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === "a")?.v).toBe(2);
  });
});
