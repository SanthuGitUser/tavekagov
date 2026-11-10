export type TnElectionCandidateRound = {
  name: string;
  party: string;
  brought_forward: number;
  current_round: number;
  total: number;
};

export type TnElectionRound = {
  round: number;
  candidates: TnElectionCandidateRound[];
};

export type TnElectionConstituencyResult = {
  ac_number: number;
  source_url: string;
  evm_round_status: string | null;
  total_rounds: number;
  rounds: TnElectionRound[];
};

export type TnElectionResultsManifest = {
  election_id: string;
  election_label?: string;
  source_base: string;
  archive_snapshot?: string | null;
  fetchedAt: string;
  count: number;
  results: TnElectionConstituencyResult[];
  errors?: Array<{ ac_number: number; error: string }>;
};

export type TnElectionResultsFeedData = {
  electionId: string;
  electionLabel: string;
  sourceBase: string;
  archiveSnapshot: string | null;
  fetchedAt: string;
  constituencyCount: number;
  results: TnElectionConstituencyResult[];
};

// Large files: shipped as separate .json assets and fetched on demand (see vite.config.ts).
import mayRoundwiseUrl from "../../../TN-Election-Results/manifests/tn_assembly_2026_roundwise.json?json-asset";
import byeRoundwiseUrl from "../../../TN-Election-Results/manifests/tn_assembly_2026_bye_roundwise.json?json-asset";

async function fetchManifest(url: string): Promise<TnElectionResultsManifest> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load election results (${response.status})`);
  }
  return (await response.json()) as TnElectionResultsManifest;
}

let cachedMayFeed: TnElectionResultsFeedData | null = null;
let loadMayPromise: Promise<TnElectionResultsFeedData> | null = null;
let cachedByeFeed: TnElectionResultsFeedData | null = null;
let loadByePromise: Promise<TnElectionResultsFeedData> | null = null;
function normalizeManifest(
  raw: TnElectionResultsManifest,
  defaults: { electionId: string; electionLabel: string; sourceBase: string },
): TnElectionResultsFeedData {
  const results = [...(raw.results ?? [])].sort((left, right) => left.ac_number - right.ac_number);
  return {
    electionId: raw.election_id ?? defaults.electionId,
    electionLabel: raw.election_label ?? defaults.electionLabel,
    sourceBase: raw.source_base ?? defaults.sourceBase,
    archiveSnapshot: raw.archive_snapshot ?? null,
    fetchedAt: raw.fetchedAt ?? "",
    constituencyCount: raw.count ?? results.length,
    results,
  };
}

export async function loadTamilNaduElectionResultsFeed(): Promise<TnElectionResultsFeedData> {
  if (cachedMayFeed) return cachedMayFeed;
  if (loadMayPromise) return loadMayPromise;

  loadMayPromise = fetchManifest(mayRoundwiseUrl).then((manifest) => {
    cachedMayFeed = normalizeManifest(manifest, {
      electionId: "tn-assembly-2026",
      electionLabel: "Tamil Nadu Legislative Assembly — May 2026",
      sourceBase: "https://results.eci.gov.in/ResultAcGenMay2026/",
    });
    return cachedMayFeed;
  });
  // Allow a retry after a network error instead of caching the rejection.
  loadMayPromise.catch(() => {
    loadMayPromise = null;
  });

  return loadMayPromise;
}

export async function loadTamilNaduElectionByeResultsFeed(): Promise<TnElectionResultsFeedData> {
  if (cachedByeFeed) return cachedByeFeed;
  if (loadByePromise) return loadByePromise;

  loadByePromise = fetchManifest(byeRoundwiseUrl).then((manifest) => {
    cachedByeFeed = normalizeManifest(manifest, {
      electionId: "tn-assembly-2026-bye",
      electionLabel: "Assembly bye-election — October 2026",
      sourceBase: "https://results.eci.gov.in/ResultAcByeOct2026/",
    });
    return cachedByeFeed;
  });
  loadByePromise.catch(() => {
    loadByePromise = null;
  });

  return loadByePromise;
}

// Final-round-only copies (built by TN-Election-Results/build_final_round_results.py).
// Enough for seat/vote summaries; ~500 KB instead of the full round-wise data.
import mayFinalRoundUrl from "../../../TN-Election-Results/manifests/tn_assembly_2026_final_round.json?json-asset";
import byeFinalRoundUrl from "../../../TN-Election-Results/manifests/tn_assembly_2026_bye_final_round.json?json-asset";

const finalRoundCache = new Map<string, Promise<TnElectionResultsFeedData>>();

function loadFinalRoundFeed(
  url: string,
  defaults: { electionId: string; electionLabel: string; sourceBase: string },
): Promise<TnElectionResultsFeedData> {
  const cached = finalRoundCache.get(url);
  if (cached) return cached;
  const promise = fetchManifest(url).then((manifest) => normalizeManifest(manifest, defaults));
  finalRoundCache.set(url, promise);
  promise.catch(() => finalRoundCache.delete(url));
  return promise;
}

/** May 2026 results with only each constituency's final round (for summaries). */
export function loadTamilNaduElectionFinalRoundFeed(): Promise<TnElectionResultsFeedData> {
  return loadFinalRoundFeed(mayFinalRoundUrl, {
    electionId: "tn-assembly-2026",
    electionLabel: "Tamil Nadu Legislative Assembly — May 2026",
    sourceBase: "https://results.eci.gov.in/ResultAcGenMay2026/",
  });
}

/** October 2026 bye-election results with only each constituency's final round. */
export function loadTamilNaduElectionByeFinalRoundFeed(): Promise<TnElectionResultsFeedData> {
  return loadFinalRoundFeed(byeFinalRoundUrl, {
    electionId: "tn-assembly-2026-bye",
    electionLabel: "Assembly bye-election — October 2026",
    sourceBase: "https://results.eci.gov.in/ResultAcByeOct2026/",
  });
}

export function getElectionResultByAc(
  data: TnElectionResultsFeedData,
  acNumber: number,
): TnElectionConstituencyResult | undefined {
  return data.results.find((row) => row.ac_number === acNumber);
}
