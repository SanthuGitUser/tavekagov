import type { TnConstituency } from "@/types/models";

export type ConstituencyFilters = {
  search: string;
  districtFilter: string;
  partyFilter: string;
  categoryFilter: string;
  memberFilter: string;
};

export function getConstituencyCategory(constituency: TnConstituency): string {
  return constituency.reserved_category ?? "General";
}

export function matchesConstituency(constituency: TnConstituency, query: string): boolean {
  const haystack = [
    constituency.name,
    constituency.district,
    constituency.member_name,
    constituency.member_display_name,
    constituency.party,
    constituency.email,
    constituency.phone,
    constituency.address,
    constituency.ac_number,
    constituency.reserved_category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function filterConstituencies(
  constituencies: TnConstituency[],
  filters: ConstituencyFilters,
): TnConstituency[] {
  const query = filters.search.trim().toLowerCase();
  return constituencies.filter((constituency) => {
    if (filters.districtFilter !== "all" && constituency.district !== filters.districtFilter) {
      return false;
    }
    if (filters.partyFilter !== "all" && constituency.party !== filters.partyFilter) {
      return false;
    }
    if (
      filters.categoryFilter !== "all" &&
      getConstituencyCategory(constituency) !== filters.categoryFilter
    ) {
      return false;
    }
    if (filters.memberFilter === "minister" && !constituency.is_minister) {
      return false;
    }
    if (filters.memberFilter === "mla" && constituency.is_minister) {
      return false;
    }
    if (!query) return true;
    return matchesConstituency(constituency, query);
  });
}
