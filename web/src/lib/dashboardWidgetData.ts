import { sortGovtSchemesByUpdated } from "@/lib/govtSchemeFilterUtils";
import {
  buildMinisterDepartmentGroups,
  type MinisterDepartmentGroup,
} from "@/lib/governmentGroupUtils";
import { tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { tamilNaduConstituencyMeta } from "@/lib/tamilNaduConstituencies";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import { getGovPressReleases, tamilNaduGovPressReleaseFeed } from "@/lib/tamilNaduGovPressReleaseFeed";
import { getGovtSchemes, tamilNaduGovtSchemesFeed } from "@/lib/tamilNaduGovtSchemesFeed";
import { getGovernmentOrders, tamilNaduGovernmentOrdersFeed } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { getMagazines, tamilNaduMagazineFeed } from "@/lib/tamilNaduMagazineFeed";
import { getChiefMinister, tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import {
  getAvailableNewsDates,
  getLatestNewsDate,
  loadNewsArticlesForDateRange,
} from "@/lib/tamilNaduNewsFeed";
import {
  getMonthlyPressReleaseCountsForRange,
  getRecentPressReleasesForRange,
  tamilNaduPressReleaseFeed,
} from "@/lib/tamilNaduPressReleaseFeed";
import {
  expandTransferPostingRows,
  getTransfersPostings,
  tamilNaduTransfersPostingsFeed,
} from "@/lib/tamilNaduTransfersPostingsFeed";
import { loadTVKManifestoFeed } from "@/lib/tvkManifestoFeed";
import type {
  GovPressRelease,
  Magazine,
  PressRelease,
  TnDept,
  TnDistrict,
  TnGoDept,
  TnGovtScheme,
  TnTransfersPosting,
  TnTransfersPostingRow,
} from "@/types/models";

export function inDashboardDateRange(
  date: string,
  range: { from: string; to: string } | null,
): boolean {
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

export function resolveDashboardNewsRange(
  range: { from: string; to: string } | null,
): { from: string; to: string } {
  const latest = getLatestNewsDate();
  const earliest = getAvailableNewsDates().at(-1) ?? latest;
  if (!range) return { from: earliest, to: latest };
  return range;
}

export async function fetchNewsArticleCountForRange(
  range: { from: string; to: string } | null,
): Promise<number> {
  const resolved = resolveDashboardNewsRange(range);
  const articles = await loadNewsArticlesForDateRange(resolved.from, resolved.to);
  return articles.length;
}

export async function fetchTvkManifestoSectionCount(): Promise<number> {
  const feed = await loadTVKManifestoFeed();
  return feed.sectionCount;
}

export function getRecentPressReleasesForDashboard(
  range: { from: string; to: string } | null,
  limit = 5,
): PressRelease[] {
  return getRecentPressReleasesForRange(limit, range);
}

export function getPressReleaseTrendForDashboard(
  range: { from: string; to: string } | null,
): { month: string; press: number }[] {
  return getMonthlyPressReleaseCountsForRange(range).slice(-6);
}

export function getRecentGovPressReleasesForDashboard(
  range: { from: string; to: string } | null,
  limit = 6,
): GovPressRelease[] {
  return getGovPressReleases()
    .filter((release) => inDashboardDateRange(release.release_date, range))
    .slice(0, limit);
}

export function getRecentGovernmentOrdersForDashboard(
  range: { from: string; to: string } | null,
  limit = 5,
): TnGoDept[] {
  return getGovernmentOrders()
    .filter((order) => inDashboardDateRange(order.go_date, range))
    .slice(0, limit);
}

export function getRecentTransfersForDashboard(
  range: { from: string; to: string } | null,
  limit = 5,
): TnTransfersPosting[] {
  return getTransfersPostings()
    .filter((posting) => inDashboardDateRange(posting.go_date, range))
    .slice(0, limit);
}

export function getRecentTransferRowsForDashboard(
  range: { from: string; to: string } | null,
  limit = 5,
): TnTransfersPostingRow[] {
  const postings = getTransfersPostings().filter((posting) =>
    inDashboardDateRange(posting.go_date, range),
  );
  return expandTransferPostingRows(postings)
    .filter((row) => row.officer_name.trim().length > 0)
    .slice(0, limit);
}

export function getFeaturedDepartments(limit = 6): TnDept[] {
  return tamilNaduDepartmentsFeed.departments.slice(0, limit);
}

export function getChiefMinisterGroup(): MinisterDepartmentGroup | null {
  const chiefMinister = getChiefMinister();
  if (!chiefMinister) return null;

  const groups = buildMinisterDepartmentGroups(
    tamilNaduMinistersFeed.ministers,
    tamilNaduDepartmentsFeed.departments,
  );
  return groups.find((group) => group.minister.id === chiefMinister.id) ?? null;
}

export function getFeaturedDistricts(limit = 4): TnDistrict[] {
  return tamilNaduDistrictsFeed.districts.slice(0, limit);
}

export function getPartySeatCounts(): { party: string; seats: number }[] {
  const counts = new Map<string, number>();
  for (const constituency of tamilNaduAssemblyConstituenciesFeed.constituencies) {
    const party = constituency.party?.trim() || "Unknown";
    counts.set(party, (counts.get(party) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([party, seats]) => ({ party, seats }))
    .sort((left, right) => right.seats - left.seats || left.party.localeCompare(right.party));
}

export function getReservedCategoryCounts(): { category: string; seats: number }[] {
  const counts = new Map<string, number>();
  for (const constituency of tamilNaduAssemblyConstituenciesFeed.constituencies) {
    const category = constituency.reserved_category ?? "General";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const order = ["General", "SC", "ST"];
  return order
    .filter((category) => counts.has(category))
    .map((category) => ({ category, seats: counts.get(category) ?? 0 }));
}

export function getPopularSchemes(limit = 4): TnGovtScheme[] {
  return getGovtSchemes()
    .filter((scheme) => scheme.is_popular)
    .slice(0, limit);
}

export function getRecentSchemes(limit = 4): TnGovtScheme[] {
  return sortGovtSchemesByUpdated(getGovtSchemes()).slice(0, limit);
}

export function getLatestMagazines(limit = 4): Magazine[] {
  return getMagazines().slice(0, limit);
}

export {
  tamilNaduPressReleaseFeed,
  tamilNaduGovPressReleaseFeed,
  tamilNaduGovernmentOrdersFeed,
  tamilNaduTransfersPostingsFeed,
  tamilNaduDepartmentsFeed,
  tamilNaduMinistersFeed,
  tamilNaduDistrictsFeed,
  tamilNaduAssemblyConstituenciesFeed,
  tamilNaduGovtSchemesFeed,
  tamilNaduMagazineFeed,
  tamilNaduConstituencyMeta,
};
