/// <reference types="node" />

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  computePartySeatCounts,
  getFinalRound,
  getRoundCandidatesSorted,
  partyCodeFromEciName,
} from "@/lib/electionResultsUtils";
import type { TnElectionResultsManifest } from "@/lib/tamilNaduElectionResultsFeed";

const MANIFEST_DIR = path.resolve(__dirname, "../../../TN-Election-Results/manifests");

function readManifest(name: string): TnElectionResultsManifest {
  return JSON.parse(readFileSync(path.join(MANIFEST_DIR, name), "utf-8")) as TnElectionResultsManifest;
}

describe("partyCodeFromEciName", () => {
  it("does not confuse AIADMK with DMK", () => {
    expect(partyCodeFromEciName("All India Anna Dravida Munnetra Kazhagam")).toBe("AIADMK");
    expect(partyCodeFromEciName("Dravida Munnetra Kazhagam")).toBe("DMK");
  });

  it("separates CPI and CPI(M)", () => {
    expect(partyCodeFromEciName("Communist Party of India (Marxist)")).toBe("CPI(M)");
    expect(partyCodeFromEciName("Communist Party of India")).toBe("CPI");
  });
});

// The dashboard reads the small final-round files; they must give the same answers
// as the full round-wise files the Election Results page uses.
describe.each([
  ["tn_assembly_2026_roundwise.json", "tn_assembly_2026_final_round.json"],
  ["tn_assembly_2026_bye_roundwise.json", "tn_assembly_2026_bye_final_round.json"],
])("%s vs %s", (fullName, finalName) => {
  const full = readManifest(fullName);
  const final = readManifest(finalName);

  it("covers the same constituencies", () => {
    expect(final.results.map((r) => r.ac_number)).toEqual(full.results.map((r) => r.ac_number));
  });

  it("gives identical seat counts", () => {
    expect([...computePartySeatCounts(final.results)].sort()).toEqual(
      [...computePartySeatCounts(full.results)].sort(),
    );
  });

  it("keeps each constituency's final tally", () => {
    full.results.forEach((result, index) => {
      const fullRound = getFinalRound(result);
      const finalRound = getFinalRound(final.results[index]);
      expect(finalRound?.round).toBe(fullRound?.round);
      expect(getRoundCandidatesSorted(finalRound)).toEqual(getRoundCandidatesSorted(fullRound));
    });
  });
});
