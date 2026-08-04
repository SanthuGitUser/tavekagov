import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import { tamilNaduGovernmentOrdersFeed } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import {
  getMonthlyPressReleaseCountsForRange,
  getRecentPressReleasesForRange,
  tamilNaduPressReleaseFeed,
} from "@/lib/tamilNaduPressReleaseFeed";
import { tamilNaduTransfersPostingsFeed } from "@/lib/tamilNaduTransfersPostingsFeed";
import type { DashboardStats, PressRelease } from "@/types/models";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return fetchDashboardStatsForRange(null);
}

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

export async function fetchMonthlyCounts(): Promise<{ month: string; press: number }[]> {
  return getMonthlyPressReleaseCountsForRange(null);
}

export async function fetchMonthlyCountsForRange(
  dateRange: { from: string; to: string } | null,
): Promise<{ month: string; press: number }[]> {
  return getMonthlyPressReleaseCountsForRange(dateRange);
}

export async function fetchRecentPressReleases(limit = 8): Promise<PressRelease[]> {
  return getRecentPressReleasesForRange(limit, null);
}

export async function fetchRecentPressReleasesForRange(
  limit: number,
  dateRange: { from: string; to: string } | null,
): Promise<PressRelease[]> {
  return getRecentPressReleasesForRange(limit, dateRange);
}
