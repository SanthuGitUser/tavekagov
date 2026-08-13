import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import { tamilNaduGovernmentOrdersFeed } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { tamilNaduPressReleaseFeed } from "@/lib/tamilNaduPressReleaseFeed";
import { tamilNaduTransfersPostingsFeed } from "@/lib/tamilNaduTransfersPostingsFeed";
import type { DashboardStats } from "@/types/models";

function inIsoRange(date: string, range: { from: string; to: string } | null): boolean {
  if (!range) return true;
  return date >= range.from && date <= range.to;
}

export async function fetchDashboardStatsForRange(
  dateRange: { from: string; to: string } | null,
): Promise<DashboardStats> {
  const pressReleases = tamilNaduPressReleaseFeed.results.filter((release) =>
    inIsoRange(release.pr_date, dateRange),
  ).length;

  const governmentOrders = tamilNaduGovernmentOrdersFeed.orders.filter((order) =>
    inIsoRange(order.go_date, dateRange),
  ).length;

  const transfersPostings = tamilNaduTransfersPostingsFeed.postings.filter((posting) =>
    inIsoRange(posting.go_date, dateRange),
  ).length;

  return {
    pressReleases,
    departments: tamilNaduDepartmentsFeed.totalResults,
    ministers: tamilNaduMinistersFeed.totalResults,
    districts: tamilNaduDistrictsFeed.totalResults,
    governmentOrders,
    transfersPostings,
  };
}
