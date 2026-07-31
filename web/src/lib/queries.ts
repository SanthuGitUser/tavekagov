import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import { tamilNaduGovernmentOrdersFeed } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import {
  getMonthlyPressReleaseCounts,
  getRecentPressReleases,
  tamilNaduPressReleaseFeed,
} from "@/lib/tamilNaduPressReleaseFeed";
import { tamilNaduTransfersPostingsFeed } from "@/lib/tamilNaduTransfersPostingsFeed";
import type { DashboardStats, PressRelease } from "@/types/models";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return {
    pressReleases: tamilNaduPressReleaseFeed.totalResults,
    departments: tamilNaduDepartmentsFeed.totalResults,
    ministers: tamilNaduMinistersFeed.totalResults,
    districts: tamilNaduDistrictsFeed.totalResults,
    governmentOrders: tamilNaduGovernmentOrdersFeed.totalResults,
    transfersPostings: tamilNaduTransfersPostingsFeed.totalResults,
  };
}

export async function fetchMonthlyCounts(): Promise<{ month: string; press: number }[]> {
  return getMonthlyPressReleaseCounts();
}

export async function fetchRecentPressReleases(limit = 8): Promise<PressRelease[]> {
  return getRecentPressReleases(limit);
}
