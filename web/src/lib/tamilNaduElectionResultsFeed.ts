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

  loadMayPromise = import(
    "../../../TN-Election-Results/manifests/tn_assembly_2026_roundwise.json"
  ).then((module) => {
    cachedMayFeed = normalizeManifest(module.default as TnElectionResultsManifest, {
      electionId: "tn-assembly-2026",
      electionLabel: "Tamil Nadu Legislative Assembly — May 2026",
      sourceBase: "https://results.eci.gov.in/ResultAcGenMay2026/",
    });
    return cachedMayFeed;
  });

  return loadMayPromise;
}

export async function loadTamilNaduElectionByeResultsFeed(): Promise<TnElectionResultsFeedData> {
  if (cachedByeFeed) return cachedByeFeed;
  if (loadByePromise) return loadByePromise;

  loadByePromise = import(
    "../../../TN-Election-Results/manifests/tn_assembly_2026_bye_roundwise.json"
  ).then((module) => {
    cachedByeFeed = normalizeManifest(module.default as TnElectionResultsManifest, {
      electionId: "tn-assembly-2026-bye",
      electionLabel: "Assembly bye-election — October 2026",
      sourceBase: "https://results.eci.gov.in/ResultAcByeOct2026/",
    });
    return cachedByeFeed;
  });

  return loadByePromise;
}

export function getElectionResultByAc(
  data: TnElectionResultsFeedData,
  acNumber: number,
): TnElectionConstituencyResult | undefined {
  return data.results.find((row) => row.ac_number === acNumber);
}
