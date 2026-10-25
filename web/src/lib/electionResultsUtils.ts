import type { TnElectionCandidateRound, TnElectionConstituencyResult } from "@/lib/tamilNaduElectionResultsFeed";

const PARTY_CODE_RULES: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /tamilaga\s+vettri/i, code: "TVK" },
  // AIADMK before DMK: full ECI name contains "Dravida Munnetra Kazhagam" as a substring.
  { pattern: /all\s+india\s+anna\s+dravida/i, code: "AIADMK" },
  { pattern: /^dravida\s+munnetra\s+kazhagam$/i, code: "DMK" },
  { pattern: /indian\s+national\s+congress/i, code: "INC" },
  { pattern: /bharatiya\s+janata/i, code: "BJP" },
  { pattern: /pattali\s+makkal/i, code: "PMK" },
  { pattern: /naam\s+tamilar/i, code: "NTK" },
  { pattern: /viduthalai\s+chiruthaigal/i, code: "VCK" },
  { pattern: /communist\s+party\s+of\s+india\s*\(marxist\)/i, code: "CPI(M)" },
  { pattern: /communist\s+party\s+of\s+india(?!\s*\(marxist\))/i, code: "CPI" },
  { pattern: /indian\s+union\s+muslim\s+league/i, code: "IUML" },
  { pattern: /desiya\s+murpokku/i, code: "DMDK" },
  { pattern: /amma\s+makkal/i, code: "AMMK" },
];

export function partyCodeFromEciName(party: string): string {
  const trimmed = party.trim();
  if (!trimmed) return "—";
  for (const rule of PARTY_CODE_RULES) {
    if (rule.pattern.test(trimmed)) return rule.code;
  }
  if (trimmed.length <= 12 && !trimmed.includes(" ")) return trimmed;
  return trimmed.length > 28 ? `${trimmed.slice(0, 25)}…` : trimmed;
}

export function getFinalRound(result: TnElectionConstituencyResult) {
  const rounds = result.rounds;
  if (rounds.length === 0) return null;
  return rounds.reduce((latest, round) => (round.round > latest.round ? round : latest), rounds[0]);
}

function isSummaryOrInvalidCandidate(row: TnElectionCandidateRound): boolean {
  const name = row.name.trim();
  const party = row.party.trim().toLowerCase();
  if (!name) return true;
  if (party === "total" || name.toLowerCase() === "total") return true;
  return false;
}

export function getRoundCandidatesSorted(
  round: { candidates: TnElectionCandidateRound[] } | null | undefined,
): TnElectionCandidateRound[] {
  if (!round) return [];
  return [...round.candidates]
    .filter((row) => !isSummaryOrInvalidCandidate(row))
    .sort((left, right) => right.total - left.total);
}

export function getLeadingCandidate(
  result: TnElectionConstituencyResult,
  roundNumber: number,
): TnElectionCandidateRound | null {
  const round = result.rounds.find((item) => item.round === roundNumber);
  const sorted = getRoundCandidatesSorted(round);
  return sorted[0] ?? null;
}

export function computePartySeatCounts(
  results: TnElectionConstituencyResult[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const result of results) {
    const leader = getLeadingCandidate(result, getFinalRound(result)?.round ?? 0);
    if (!leader || leader.name.toUpperCase() === "NOTA") continue;
    const code = partyCodeFromEciName(leader.party);
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return counts;
}
