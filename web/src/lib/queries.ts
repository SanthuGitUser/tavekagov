import {
  inDashboardDateRange,
  tamilNaduAssemblyConstituenciesFeed,
  tamilNaduConstituencyMeta,
  tamilNaduDepartmentsFeed,
  tamilNaduDistrictsFeed,
  tamilNaduGovPressReleaseFeed,
  tamilNaduGovtSchemesFeed,
  tamilNaduGovernmentOrdersFeed,
  tamilNaduMagazineFeed,
  tamilNaduMinistersFeed,
  tamilNaduPressReleaseFeed,
  tamilNaduTransfersPostingsFeed,
} from "@/lib/dashboardWidgetData";
import type { DashboardStats } from "@/types/models";

export async function fetchDashboardStatsForRange(
  dateRange: { from: string; to: string } | null,
): Promise<DashboardStats> {
  const pressReleases = tamilNaduPressReleaseFeed.results.filter((release) =>
    inDashboardDateRange(release.pr_date, dateRange),
  ).length;

  const govPressReleaseImages = tamilNaduGovPressReleaseFeed.releases.filter((release) =>
    inDashboardDateRange(release.release_date, dateRange),
  ).length;

  const governmentOrders = tamilNaduGovernmentOrdersFeed.orders.filter((order) =>
    inDashboardDateRange(order.go_date, dateRange),
  ).length;

  const transfersPostings = tamilNaduTransfersPostingsFeed.postings.filter((posting) =>
    inDashboardDateRange(posting.go_date, dateRange),
  ).length;

  return {
    pressReleases,
    govPressReleaseImages,
    governmentOrders,
    transfersPostings,
    departments: tamilNaduDepartmentsFeed.totalResults,
    ministers: tamilNaduMinistersFeed.totalResults,
    districts: tamilNaduDistrictsFeed.totalResults,
    constituencies: tamilNaduAssemblyConstituenciesFeed.totalResults,
    govtSchemes: tamilNaduGovtSchemesFeed.totalResults,
    govtSchemesState: tamilNaduGovtSchemesFeed.stateCount,
    govtSchemesHousing: tamilNaduGovtSchemesFeed.housingCount,
    govtSchemesScholarships: tamilNaduGovtSchemesFeed.scholarshipsCount,
    magazineIssues: tamilNaduMagazineFeed.totalResults,
    mapDistricts: tamilNaduConstituencyMeta.totalDistricts,
    mapConstituencies: tamilNaduConstituencyMeta.totalConstituencies,
  };
}
