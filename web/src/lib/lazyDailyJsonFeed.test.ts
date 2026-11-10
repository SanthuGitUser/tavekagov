import { describe, expect, it } from "vitest";

import { createLazyFeed, extractIsoDateFromPath } from "@/lib/lazyDailyJsonFeed";

type Feed = { items: number[] };

function setup(build: () => Promise<Feed>) {
  let exported: Feed = { items: [] };
  let builds = 0;
  const feed = createLazyFeed<Feed>({
    empty: () => ({ items: [] }),
    build: () => {
      builds += 1;
      return build();
    },
    isLoaded: (value) => value.items.length > 0,
    onLoaded: (value) => {
      exported = value;
    },
  });
  return { feed, exported: () => exported, builds: () => builds };
}

describe("createLazyFeed", () => {
  it("builds once and shares the result", async () => {
    const { feed, exported, builds } = setup(async () => ({ items: [1, 2] }));
    const [first, second] = await Promise.all([feed.ensureLoaded(), feed.ensureLoaded()]);
    expect(first).toBe(second);
    expect(await feed.ensureLoaded()).toBe(first);
    expect(exported().items).toEqual([1, 2]);
    expect(builds()).toBe(1);
  });

  it("retries after a failed build", async () => {
    let fail = true;
    const { feed, builds } = setup(async () => {
      if (fail) throw new Error("offline");
      return { items: [3] };
    });
    await expect(feed.ensureLoaded()).rejects.toThrow("offline");
    fail = false;
    expect((await feed.ensureLoaded()).items).toEqual([3]);
    expect(builds()).toBe(2);
  });

  it("reset clears the exported value and rebuilds next time", async () => {
    const { feed, exported, builds } = setup(async () => ({ items: [4] }));
    await feed.ensureLoaded();
    feed.reset();
    expect(exported().items).toEqual([]);
    await feed.ensureLoaded();
    expect(builds()).toBe(2);
  });
});

describe("extractIsoDateFromPath", () => {
  it("reads the date from a daily file path", () => {
    expect(extractIsoDateFromPath("../TN-News/Response-JSON/2026-11-05.json")).toBe("2026-11-05");
    expect(extractIsoDateFromPath("../dept.json")).toBeNull();
  });
});
