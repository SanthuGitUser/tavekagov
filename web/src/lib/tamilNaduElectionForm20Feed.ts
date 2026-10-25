export type TnForm20Booth = {
  polling_station_serial: number;
  location: string | null;
  electors: number | null;
  votes: number[];
  valid_votes: number;
  rejected_votes: number;
  nota: number;
  total: number;
  tendered_votes: number;
};

export type TnForm20ConstituencyData = {
  ac_number: number;
  election_id: string;
  source_url: string;
  layout: string;
  candidates: string[];
  booth_count: number;
  booths: TnForm20Booth[];
};

export type TnForm20Manifest = {
  election_id: string;
  source_index: string;
  fetchedAt: string;
  count: number;
  constituencies: Array<{
    ac_number: number;
    source_url: string;
    booth_count: number;
    candidate_count: number;
    layout: string;
  }>;
  errors?: Array<{ ac_number: number; error: string }>;
};

export type TnForm20ManifestFeed = {
  electionId: string;
  sourceIndex: string;
  fetchedAt: string;
  constituencies: TnForm20Manifest["constituencies"];
};

const mayManifestLoaders = import.meta.glob(
  "../../../TN-Election-Results/manifests/tn_assembly_2026_form20/manifest.json",
  { import: "default" },
) as Record<string, () => Promise<TnForm20Manifest>>;

const byeManifestLoaders = import.meta.glob(
  "../../../TN-Election-Results/manifests/tn_assembly_2026_bye_form20/manifest.json",
  { import: "default" },
) as Record<string, () => Promise<TnForm20Manifest>>;

const mayAcLoaders = import.meta.glob(
  "../../../TN-Election-Results/manifests/tn_assembly_2026_form20/ac/*.json",
  { import: "default" },
) as Record<string, () => Promise<TnForm20ConstituencyData>>;

const byeAcLoaders = import.meta.glob(
  "../../../TN-Election-Results/manifests/tn_assembly_2026_bye_form20/ac/*.json",
  { import: "default" },
) as Record<string, () => Promise<TnForm20ConstituencyData>>;

let cachedMayManifest: TnForm20ManifestFeed | null = null;
let loadMayManifestPromise: Promise<TnForm20ManifestFeed | null> | null = null;
let cachedByeManifest: TnForm20ManifestFeed | null = null;
let loadByeManifestPromise: Promise<TnForm20ManifestFeed | null> | null = null;
const acDataCache = new Map<string, TnForm20ConstituencyData>();
const acLoadPromises = new Map<string, Promise<TnForm20ConstituencyData | null>>();

function normalizeManifest(raw: TnForm20Manifest): TnForm20ManifestFeed {
  return {
    electionId: raw.election_id,
    sourceIndex: raw.source_index,
    fetchedAt: raw.fetchedAt,
    constituencies: [...(raw.constituencies ?? [])].sort((a, b) => a.ac_number - b.ac_number),
  };
}

async function loadManifestFrom(
  loaders: Record<string, () => Promise<TnForm20Manifest>>,
): Promise<TnForm20Manifest | null> {
  const loader = Object.values(loaders)[0];
  if (!loader) return null;
  try {
    return await loader();
  } catch {
    return null;
  }
}

export async function loadMayForm20Manifest(): Promise<TnForm20ManifestFeed | null> {
  if (cachedMayManifest) return cachedMayManifest;
  if (loadMayManifestPromise) return loadMayManifestPromise;
  loadMayManifestPromise = loadManifestFrom(mayManifestLoaders).then((raw) => {
    if (!raw) {
      cachedMayManifest = null;
      return null;
    }
    cachedMayManifest = normalizeManifest(raw);
    return cachedMayManifest;
  });
  return loadMayManifestPromise;
}

export async function loadByeForm20Manifest(): Promise<TnForm20ManifestFeed | null> {
  if (cachedByeManifest) return cachedByeManifest;
  if (loadByeManifestPromise) return loadByeManifestPromise;
  loadByeManifestPromise = loadManifestFrom(byeManifestLoaders).then((raw) => {
    if (!raw) {
      cachedByeManifest = null;
      return null;
    }
    cachedByeManifest = normalizeManifest(raw);
    return cachedByeManifest;
  });
  return loadByeManifestPromise;
}

function acLoaderFor(
  election: "may" | "bye",
  acNumber: number,
): (() => Promise<TnForm20ConstituencyData>) | undefined {
  const suffix = `/${String(acNumber).padStart(3, "0")}.json`;
  const loaders = election === "bye" ? byeAcLoaders : mayAcLoaders;
  const entry = Object.entries(loaders).find(([path]) => path.endsWith(suffix));
  return entry?.[1];
}

export async function loadForm20ForAc(
  election: "may" | "bye",
  acNumber: number,
): Promise<TnForm20ConstituencyData | null> {
  const cacheKey = `${election}:${acNumber}`;
  const cached = acDataCache.get(cacheKey);
  if (cached) return cached;

  const pending = acLoadPromises.get(cacheKey);
  if (pending) return pending;

  const loader = acLoaderFor(election, acNumber);
  if (!loader) {
    return null;
  }

  const promise = loader()
    .then((data) => {
      acDataCache.set(cacheKey, data);
      return data;
    })
    .catch(() => null);

  acLoadPromises.set(cacheKey, promise);
  return promise;
}

export function hasForm20ForAc(
  manifest: TnForm20ManifestFeed | null,
  acNumber: number,
): boolean {
  if (!manifest) return false;
  return manifest.constituencies.some((row) => row.ac_number === acNumber);
}
