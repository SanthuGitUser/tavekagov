import type { GovtSchemeSectionFilter } from "@/context/GovtSchemesSearchContext";
import type { TnGovtScheme } from "@/types/models";

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function parseGovtSchemeUpdatedAt(label: string | null): number | null {
  if (!label) return null;

  const match = label.match(/(\d{1,2}\s+)?([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;

  const [, dayPart, monthName, yearText] = match;
  const month = MONTH_INDEX[monthName.slice(0, 3).toLowerCase()];
  if (month === undefined) return null;

  const year = Number.parseInt(yearText, 10);
  const day = dayPart ? Number.parseInt(dayPart.trim(), 10) : 1;
  return Date.UTC(year, month, day);
}

export function sortGovtSchemesByUpdated(schemes: TnGovtScheme[]): TnGovtScheme[] {
  return [...schemes].sort((left, right) => {
    const leftUpdated = parseGovtSchemeUpdatedAt(left.updated_label);
    const rightUpdated = parseGovtSchemeUpdatedAt(right.updated_label);

    if (leftUpdated === null && rightUpdated === null) {
      return left.display_order - right.display_order;
    }
    if (leftUpdated === null) return 1;
    if (rightUpdated === null) return -1;
    if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;

    return left.display_order - right.display_order;
  });
}

export function matchesGovtSchemeSearch(scheme: TnGovtScheme, query: string): boolean {
  const haystack = [scheme.title, scheme.category, scheme.benefit_summary, scheme.section]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterGovtSchemes(
  schemes: TnGovtScheme[],
  {
    search = "",
    sectionFilter = "state",
    categoryFilter = "all",
  }: {
    search?: string;
    sectionFilter?: GovtSchemeSectionFilter;
    categoryFilter?: string;
  },
): TnGovtScheme[] {
  const query = search.trim().toLowerCase();
  const filtered = schemes.filter((scheme) => {
    if (scheme.section !== sectionFilter) return false;
    if (categoryFilter !== "all" && scheme.category !== categoryFilter) return false;
    if (!query) return true;
    return matchesGovtSchemeSearch(scheme, query);
  });

  return sortGovtSchemesByUpdated(filtered);
}

export function getGovtSchemesForSection(
  schemes: TnGovtScheme[],
  sectionFilter: GovtSchemeSectionFilter,
): TnGovtScheme[] {
  return schemes.filter((scheme) => scheme.section === sectionFilter);
}
