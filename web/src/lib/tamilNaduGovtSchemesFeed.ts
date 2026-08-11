import type { GovtSchemeSectionFilter } from "@/context/GovtSchemesSearchContext";
import type { TnGovtScheme } from "@/types/models";

import { sortGovtSchemesByUpdated } from "@/lib/govtSchemeFilterUtils";

import schemesManifest from "../../../TN-Govt-Schemes/manifests/tn_govt_schemes.json";

type GovtSchemesManifest = {
  source_urls?: {
    state?: string;
    housing?: string;
    scholarships?: string;
  };
  source_url?: string;
  fetchedAt?: string;
  count?: number;
  state_count?: number;
  housing_count?: number;
  scholarships_count?: number;
  schemes: TnGovtScheme[];
};

const manifest = schemesManifest as GovtSchemesManifest;

const schemes = sortGovtSchemesByUpdated(manifest.schemes);

export const tamilNaduGovtSchemesFeed = {
  sourceUrl: manifest.source_urls?.state ?? manifest.source_url ?? "https://schemesinindia.in/schemes/tamil-nadu",
  housingSourceUrl: manifest.source_urls?.housing ?? "https://schemesinindia.in/housing",
  scholarshipsSourceUrl: manifest.source_urls?.scholarships ?? "https://schemesinindia.in/scholarships",
  fetchedAt: manifest.fetchedAt,
  totalResults: manifest.count ?? schemes.length,
  stateCount: manifest.state_count ?? schemes.filter((scheme) => scheme.section === "state").length,
  housingCount: manifest.housing_count ?? schemes.filter((scheme) => scheme.section === "housing").length,
  scholarshipsCount:
    manifest.scholarships_count ?? schemes.filter((scheme) => scheme.section === "scholarships").length,
  schemes,
};

export function getGovtSchemeCategories(
  inputSchemes: TnGovtScheme[] = tamilNaduGovtSchemesFeed.schemes,
): string[] {
  return [...new Set(inputSchemes.map((scheme) => scheme.category))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function getGovtSchemes(): TnGovtScheme[] {
  return tamilNaduGovtSchemesFeed.schemes;
}

export function getGovtSchemeSectionCount(section: GovtSchemeSectionFilter): number {
  if (section === "housing") return tamilNaduGovtSchemesFeed.housingCount;
  if (section === "scholarships") return tamilNaduGovtSchemesFeed.scholarshipsCount;
  return tamilNaduGovtSchemesFeed.stateCount;
}
