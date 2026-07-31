import type { TnMinister } from "@/types/models";

import ministersManifest from "../../../TN-GOV_Council Of Ministers/manifests/tn_ministers.json";

type MinistersManifest = {
  source_url?: string;
  count?: number;
  ministers: TnMinister[];
};

const manifest = ministersManifest as MinistersManifest;

export const tamilNaduMinistersFeed = {
  sourceUrl: manifest.source_url ?? "https://www.tn.gov.in/minister_list.php",
  totalResults: manifest.count ?? manifest.ministers.length,
  ministers: [...manifest.ministers].sort(
    (left, right) => left.display_order - right.display_order,
  ),
};

export function getMinistersById(): Map<number, TnMinister> {
  return new Map(tamilNaduMinistersFeed.ministers.map((minister) => [minister.id, minister]));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildMinistersByKey(
  ministers: TnMinister[] = tamilNaduMinistersFeed.ministers,
): Record<string, TnMinister> {
  return Object.fromEntries(ministers.map((minister) => [normalizeKey(minister.name), minister]));
}

export function getChiefMinister(): TnMinister | undefined {
  return tamilNaduMinistersFeed.ministers.find((minister) => minister.is_chief_minister);
}
