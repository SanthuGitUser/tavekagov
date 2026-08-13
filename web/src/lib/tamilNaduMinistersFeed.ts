import type { TnMinister } from "@/types/models";

import ministersManifest from "../../../TN-GOV_Council Of Ministers/manifests/tn_ministers.json";

type RawMinister = {
  id: number;
  name: string;
  designation: string;
  portfolio?: string | null;
  portfolios?: string[] | null;
  photo_url: string | null;
  display_order: number;
  is_chief_minister: boolean;
};

type MinistersManifest = {
  source_url?: string;
  count?: number;
  ministers: RawMinister[];
};

const manifest = ministersManifest as MinistersManifest;

function stripHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

function splitPortfolioText(value: string): string[] {
  const text = stripHtml(value).trim();
  if (!text) return [];

  const parts: string[] = [];
  let buff = "";
  let depth = 0;

  for (const ch of text) {
    if (ch === "(") depth += 1;
    else if (ch === ")" && depth > 0) depth -= 1;

    if (ch === "," && depth === 0) {
      const item = buff.trim().replace(/,+$/, "");
      if (item) parts.push(item);
      buff = "";
    } else {
      buff += ch;
    }
  }

  const last = buff.trim().replace(/[.,]+$/, "");
  if (last) parts.push(last);

  return parts;
}

function normalizeMinister(raw: RawMinister): TnMinister {
  const portfolios =
    Array.isArray(raw.portfolios) && raw.portfolios.length > 0
      ? raw.portfolios.map((item) => stripHtml(item).trim()).filter(Boolean)
      : splitPortfolioText(raw.portfolio ?? "");

  return {
    id: raw.id,
    name: raw.name,
    designation: stripHtml(raw.designation),
    portfolios,
    photo_url: raw.photo_url,
    display_order: raw.display_order,
    is_chief_minister: raw.is_chief_minister,
  };
}

const ministers = manifest.ministers.map(normalizeMinister);

export const tamilNaduMinistersFeed = {
  sourceUrl: manifest.source_url ?? "https://www.tn.gov.in/minister_list.php",
  totalResults: manifest.count ?? ministers.length,
  ministers: [...ministers].sort((left, right) => left.display_order - right.display_order),
};

export function getMinistersById(): Map<number, TnMinister> {
  return new Map(tamilNaduMinistersFeed.ministers.map((minister) => [minister.id, minister]));
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function buildMinistersByKey(
  ministersList: TnMinister[] = tamilNaduMinistersFeed.ministers,
): Record<string, TnMinister> {
  return Object.fromEntries(
    ministersList.map((minister) => [normalizeKey(minister.name), minister]),
  );
}

export function getChiefMinister(): TnMinister | undefined {
  return tamilNaduMinistersFeed.ministers.find((minister) => minister.is_chief_minister);
}
