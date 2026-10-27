import {
  computePartySeatCounts,
  getFinalRound,
  getRoundCandidatesSorted,
  partyCodeFromEciName,
} from "@/lib/electionResultsUtils";
import { tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import {
  loadTamilNaduElectionByeResultsFeed,
  loadTamilNaduElectionResultsFeed,
  type TnElectionConstituencyResult,
  type TnElectionResultsFeedData,
} from "@/lib/tamilNaduElectionResultsFeed";

export const TN_2026_BYE_AC_NUMBERS = [35, 101] as const;

export type May2026PartySeatsRow = { party: string; seats: number };

export type May2026PartyVotesRow = { party: string; votes: number; share: number };

export type May2026CloseRaceRow = {
  acNumber: number;
  constituencyName: string;
  district: string | null;
  leaderName: string;
  leaderParty: string;
  runnerName: string;
  runnerParty: string;
  margin: number;
  marginPct: number;
  leaderVotes: number;
  runnerVotes: number;
};

export type May2026TvKHighlightRow = {
  acNumber: number;
  constituencyName: string;
  district: string | null;
  candidateName: string;
  votes: number;
  won: boolean;
};

export type May2026DashboardAnalytics = {
  feed: TnElectionResultsFeedData;
  constituencyCount: number;
  partySeats: May2026PartySeatsRow[];
  partyVotes: May2026PartyVotesRow[];
  marginRaces: May2026CloseRaceRow[];
  closeRaces: May2026CloseRaceRow[];
  tvkHighlights: May2026TvKHighlightRow[];
  averageFinalRounds: number;
  majoritySeats: number;
  leadingParty: string | null;
};

const constituencyMetaByAc = new Map(
  tamilNaduAssemblyConstituenciesFeed.constituencies.map((row) => [row.ac_number, row]),
);

function constituencyLabel(acNumber: number): { name: string; district: string | null } {
  const meta = constituencyMetaByAc.get(acNumber);
  if (!meta) return { name: `AC ${acNumber}`, district: null };
  const name = meta.name
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return { name, district: meta.district ?? null };
}

function analyzeConstituency(result: TnElectionConstituencyResult): {
  closeRace: May2026CloseRaceRow | null;
  tvk: May2026TvKHighlightRow | null;
  partyVotes: Map<string, number>;
  finalRoundNumber: number;
} {
  const finalRound = getFinalRound(result);
  const candidates = getRoundCandidatesSorted(finalRound);
  const partyVotes = new Map<string, number>();
  for (const row of candidates) {
    const code = partyCodeFromEciName(row.party);
    partyVotes.set(code, (partyVotes.get(code) ?? 0) + row.total);
  }

  let closeRace: May2026CloseRaceRow | null = null;
  if (candidates.length >= 2) {
    const leader = candidates[0];
    const runner = candidates[1];
    const margin = leader.total - runner.total;
    const validTotal = candidates.reduce((sum, row) => sum + row.total, 0);
    const { name, district } = constituencyLabel(result.ac_number);
    closeRace = {
      acNumber: result.ac_number,
      constituencyName: name,
      district,
      leaderName: leader.name,
      leaderParty: partyCodeFromEciName(leader.party),
      runnerName: runner.name,
      runnerParty: partyCodeFromEciName(runner.party),
      margin,
      marginPct: validTotal > 0 ? (margin / validTotal) * 100 : 0,
      leaderVotes: leader.total,
      runnerVotes: runner.total,
    };
  }

  const tvkCandidate = candidates.find((row) => partyCodeFromEciName(row.party) === "TVK");
  let tvk: May2026TvKHighlightRow | null = null;
  if (tvkCandidate) {
    const { name, district } = constituencyLabel(result.ac_number);
    tvk = {
      acNumber: result.ac_number,
      constituencyName: name,
      district,
      candidateName: tvkCandidate.name,
      votes: tvkCandidate.total,
      won: candidates[0]?.name === tvkCandidate.name,
    };
  }

  return {
    closeRace,
    tvk,
    partyVotes,
    finalRoundNumber: finalRound?.round ?? 0,
  };
}

let cachedAnalyticsPromise: Promise<May2026DashboardAnalytics> | null = null;

export async function loadMay2026DashboardAnalytics(): Promise<May2026DashboardAnalytics> {
  if (cachedAnalyticsPromise) return cachedAnalyticsPromise;

  cachedAnalyticsPromise = buildMay2026DashboardAnalytics().catch((error) => {
    cachedAnalyticsPromise = null;
    throw error;
  });
  return cachedAnalyticsPromise;
}

async function buildMay2026DashboardAnalytics(): Promise<May2026DashboardAnalytics> {
  const feed = await loadTamilNaduElectionResultsFeed();
  const seatMap = computePartySeatCounts(feed.results);
  const partySeats = [...seatMap.entries()]
    .map(([party, seats]) => ({ party, seats }))
    .sort((left, right) => right.seats - left.seats || left.party.localeCompare(right.party));

  const voteTotals = new Map<string, number>();
  const marginRaces: May2026CloseRaceRow[] = [];
  const tvkRows: May2026TvKHighlightRow[] = [];
  let roundSum = 0;

  for (const result of feed.results) {
    const analysis = analyzeConstituency(result);
    roundSum += analysis.finalRoundNumber;
    if (analysis.closeRace && analysis.closeRace.margin > 0) {
      marginRaces.push(analysis.closeRace);
    }
    if (analysis.tvk) tvkRows.push(analysis.tvk);
    for (const [party, votes] of analysis.partyVotes.entries()) {
      voteTotals.set(party, (voteTotals.get(party) ?? 0) + votes);
    }
  }

  const totalVotes = [...voteTotals.values()].reduce((sum, value) => sum + value, 0);
  const partyVotes = [...voteTotals.entries()]
    .map(([party, votes]) => ({
      party,
      votes,
      share: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
    }))
    .sort((left, right) => right.votes - left.votes || left.party.localeCompare(right.party));

  const closeWins = [...marginRaces].sort((left, right) => left.margin - right.margin);

  tvkRows.sort((left, right) => {
    if (left.won !== right.won) return left.won ? -1 : 1;
    return right.votes - left.votes;
  });

  const majoritySeats = Math.floor(feed.results.length / 2) + 1;
  const leadingParty = partySeats[0]?.party ?? null;

  return {
    feed,
    constituencyCount: feed.results.length,
    partySeats,
    partyVotes,
    marginRaces,
    closeRaces: closeWins.slice(0, 6),
    tvkHighlights: tvkRows.slice(0, 6),
    averageFinalRounds:
      feed.results.length > 0 ? roundSum / feed.results.length : 0,
    majoritySeats,
    leadingParty,
  };
}

export type May2026MarginPartyFilter = "All" | "TVK" | "AIADMK" | "DMK";

export type May2026MarginMetric = "biggest-win" | "close-win" | "biggest-loss" | "close-loss";

const MARGIN_CHART_LIMIT = 8;

export function selectMarginRaces(
  races: May2026CloseRaceRow[],
  metric: May2026MarginMetric,
  party: May2026MarginPartyFilter,
  limit = MARGIN_CHART_LIMIT,
): May2026CloseRaceRow[] {
  const isLossView = metric === "biggest-loss" || metric === "close-loss";
  const isCloseMetric = metric === "close-win" || metric === "close-loss";

  let filtered = races;
  if (party !== "All") {
    filtered = races.filter((race) =>
      isLossView ? race.runnerParty === party : race.leaderParty === party,
    );
  }

  const sorted = [...filtered].sort((left, right) =>
    isCloseMetric ? left.margin - right.margin : right.margin - left.margin,
  );
  return sorted.slice(0, limit);
}

export type ByeVsMayPartyRow = {
  party: string;
  mayVotes: number;
  mayShare: number;
  byeVotes: number;
  byeShare: number;
};

export type ByeVsMayAcComparison = {
  acNumber: number;
  constituencyName: string;
  district: string | null;
  mayLeadingParty: string;
  byeLeadingParty: string;
  mayTotalVotes: number;
  byeTotalVotes: number;
  parties: ByeVsMayPartyRow[];
};

function partyVotesForResult(result: TnElectionConstituencyResult): Map<string, number> {
  const finalRound = getFinalRound(result);
  const candidates = getRoundCandidatesSorted(finalRound);
  const totals = new Map<string, number>();
  for (const row of candidates) {
    const code = partyCodeFromEciName(row.party);
    totals.set(code, (totals.get(code) ?? 0) + row.total);
  }
  return totals;
}

function leadingPartyCode(result: TnElectionConstituencyResult): string {
  const finalRound = getFinalRound(result);
  const sorted = getRoundCandidatesSorted(finalRound);
  const leader = sorted[0];
  return leader ? partyCodeFromEciName(leader.party) : "—";
}

function totalValidVotes(votesByParty: Map<string, number>): number {
  return [...votesByParty.values()].reduce((sum, value) => sum + value, 0);
}

function compareAc(
  acNumber: number,
  mayResult: TnElectionConstituencyResult | undefined,
  byeResult: TnElectionConstituencyResult | undefined,
): ByeVsMayAcComparison | null {
  if (!mayResult || !byeResult) return null;

  const mayVotes = partyVotesForResult(mayResult);
  const byeVotes = partyVotesForResult(byeResult);
  const mayTotal = totalValidVotes(mayVotes);
  const byeTotal = totalValidVotes(byeVotes);
  const partySet = new Set([...mayVotes.keys(), ...byeVotes.keys()]);

  const parties: ByeVsMayPartyRow[] = [...partySet]
    .map((party) => {
      const may = mayVotes.get(party) ?? 0;
      const bye = byeVotes.get(party) ?? 0;
      return {
        party,
        mayVotes: may,
        mayShare: mayTotal > 0 ? (may / mayTotal) * 100 : 0,
        byeVotes: bye,
        byeShare: byeTotal > 0 ? (bye / byeTotal) * 100 : 0,
      };
    })
    .sort(
      (left, right) =>
        Math.max(right.mayVotes, right.byeVotes) - Math.max(left.mayVotes, left.byeVotes) ||
        left.party.localeCompare(right.party),
    )
    .slice(0, 6);

  const { name, district } = constituencyLabel(acNumber);

  return {
    acNumber,
    constituencyName: name,
    district,
    mayLeadingParty: leadingPartyCode(mayResult),
    byeLeadingParty: leadingPartyCode(byeResult),
    mayTotalVotes: mayTotal,
    byeTotalVotes: byeTotal,
    parties,
  };
}

let cachedByeVsMayPromise: Promise<ByeVsMayAcComparison[]> | null = null;

export async function loadByeVsMayComparisons(): Promise<ByeVsMayAcComparison[]> {
  if (cachedByeVsMayPromise) return cachedByeVsMayPromise;

  cachedByeVsMayPromise = (async () => {
    const [mayFeed, byeFeed] = await Promise.all([
      loadTamilNaduElectionResultsFeed(),
      loadTamilNaduElectionByeResultsFeed(),
    ]);

    return TN_2026_BYE_AC_NUMBERS.map((acNumber) => {
      const mayResult = mayFeed.results.find((row) => row.ac_number === acNumber);
      const byeResult = byeFeed.results.find((row) => row.ac_number === acNumber);
      return compareAc(acNumber, mayResult, byeResult);
    }).filter((row): row is ByeVsMayAcComparison => row !== null);
  })().catch((error) => {
    cachedByeVsMayPromise = null;
    throw error;
  });

  return cachedByeVsMayPromise;
}
