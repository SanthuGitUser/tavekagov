import mlaManifest from "../../../TN-Constituencies/manifests/tn_mla_myneta.json";

export type TnMlaCandidateSummary = {
  candidate_id: string;
  candidate_name: string;
  constituency_name: string;
  district: string;
  party: string;
  criminal_case: string;
  education: string;
  education_category: string;
  total_assets: string;
  liabilities: string;
  candidate_url: string;
};

type MlaManifest = {
  source?: string;
  generated_at?: string;
  count?: number;
  mlas: TnMlaCandidateSummary[];
};

const manifest = mlaManifest as MlaManifest;

function normalizeMlaPartyName(value: string): string {
  const trimmed = (value ?? "").trim();
  const withoutSuffix = trimmed.replace(/\s+S$/i, "").trim();
  const PARTY_CODE_BY_NAME: Record<string, string> = {
    "Amma Makkal Munnettra Kazagam": "AMMK",
    "Desiya Murpokku Dravida Kazhagam": "DMDK",
    "Indian Union Muslim League": "IUML",
    "Pattali Makkal Katchi": "PMK",
    "Tamilaga Vettri Kazhagam": "TVK",
    "Viduthalai Chiruthaigal Katchi": "VCK",
  };
  return PARTY_CODE_BY_NAME[withoutSuffix] ?? withoutSuffix;
}

export const tamilNaduMlaFeed = {
  source: manifest.source ?? "myneta.info",
  generatedAt: manifest.generated_at ?? null,
  totalResults: manifest.count ?? manifest.mlas.length,
  mlas: manifest.mlas.map((mla) => ({ ...mla, party: normalizeMlaPartyName(mla.party) })),
};
