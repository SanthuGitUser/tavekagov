import type { TnConstituency } from "@/types/models";

import constituenciesManifest from "../../../TN-Constituencies/manifests/tn_constituencies.json";

type ConstituenciesManifest = {
  source_urls?: string[];
  fetchedAt?: string;
  count?: number;
  constituencies: TnConstituency[];
};

const manifest = constituenciesManifest as ConstituenciesManifest;

export const tamilNaduAssemblyConstituenciesFeed = {
  sourceUrls: manifest.source_urls ?? [
    "https://assembly.tn.gov.in/17thassembly_members.php",
    "https://assembly.tn.gov.in/17thassembly/members.php",
  ],
  fetchedAt: manifest.fetchedAt ?? "",
  totalResults: manifest.count ?? manifest.constituencies.length,
  constituencies: [...manifest.constituencies].sort(
    (left, right) => left.display_order - right.display_order,
  ),
};

export function getConstituenciesByDistrict(): Map<string, TnConstituency[]> {
  const grouped = new Map<string, TnConstituency[]>();
  for (const constituency of tamilNaduAssemblyConstituenciesFeed.constituencies) {
    const district = constituency.district ?? "Unknown";
    const existing = grouped.get(district);
    if (existing) existing.push(constituency);
    else grouped.set(district, [constituency]);
  }
  return grouped;
}

export function getConstituencyDistricts(): string[] {
  return [...new Set(
    tamilNaduAssemblyConstituenciesFeed.constituencies
      .map((row) => row.district)
      .filter((district): district is string => Boolean(district)),
  )].sort((a, b) => a.localeCompare(b));
}

export function getConstituencyParties(): string[] {
  return [...new Set(
    tamilNaduAssemblyConstituenciesFeed.constituencies
      .map((row) => row.party)
      .filter((party): party is string => Boolean(party)),
  )].sort((a, b) => a.localeCompare(b));
}

export function getConstituencyCategories(): string[] {
  const categories = new Set(
    tamilNaduAssemblyConstituenciesFeed.constituencies.map(
      (row) => row.reserved_category ?? "General",
    ),
  );
  const order = ["General", "SC", "ST"];
  return order.filter((category) => categories.has(category));
}
