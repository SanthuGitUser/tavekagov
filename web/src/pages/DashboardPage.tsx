import {
  ArrowRightLeft,
  FileText,
  Gavel,
} from "lucide-react";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { NewsCategoryChart } from "@/components/dashboard/NewsCategoryChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDashboardDateRange } from "@/context/DashboardDateRangeContext";
import {
  fetchDashboardStatsForRange,
} from "@/lib/queries";
import { tamilNaduNewsFeed } from "@/lib/tamilNaduNewsFeed";
import { tamilNaduPressReleaseFeed } from "@/lib/tamilNaduPressReleaseFeed";

export function DashboardPage() {
  const dashboardDateRange = useDashboardDateRange();
  const dateRange = dashboardDateRange?.effectiveRange ?? null;

  const statsQuery = useAsyncData(
    () => fetchDashboardStatsForRange(dateRange),
    [dateRange?.from, dateRange?.to],
  );

  const loading = statsQuery.loading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-6">
        {statsQuery.error ? <ErrorState message={statsQuery.error} /> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Press releases"
            value={statsQuery.data?.pressReleases ?? 0}
            icon={FileText}
            loading={loading}
          />
          <StatCard
            title="Government orders"
            value={statsQuery.data?.governmentOrders ?? 0}
            icon={Gavel}
            loading={loading}
          />
          <StatCard
            title="Transfers and postings"
            value={statsQuery.data?.transfersPostings ?? 0}
            icon={ArrowRightLeft}
            loading={loading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ActivityChart
            className="min-h-[22rem]"
            releases={tamilNaduPressReleaseFeed.results}
            dateRange={dateRange}
          />
          <NewsCategoryChart articles={tamilNaduNewsFeed.results} dateRange={dateRange} />
        </div>
      </div>
    </div>
  );
}
