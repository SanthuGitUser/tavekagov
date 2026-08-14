import { DashboardKpiGrid } from "@/components/dashboard/DashboardKpiGrid";
import { DashboardSection } from "@/components/dashboard/DashboardWidgetCard";
import {
  ConstituenciesPartyBreakdownWidget,
  DepartmentsTilesWidget,
  DistrictsFeaturedWidget,
  DistrictsMiniMapWidget,
  MapsMetaWidget,
  MinistersChiefMinisterWidget,
} from "@/components/dashboard/widgets/AdministrationDashboardWidgets";
import {
  GovtSchemesPopularWidget,
  GovtSchemesRecentWidget,
  MagazineLatestWidget,
  NewsFullPagePreviewWidget,
  NewsHeadlinesWidget,
  TvkManifestoPreviewWidget,
  TvkManifestoSummaryWidget,
  useDashboardAsyncCounts,
} from "@/components/dashboard/widgets/ContentDashboardWidgets";
import {
  GovPressReleasesImageGridWidget,
  GovPressReleasesRecentWidget,
  GovernmentOrdersRecentWidget,
  GovernmentOrdersTableWidget,
  PressReleasesRecentWidget,
  PressReleasesTimelineWidget,
  PressReleasesTrendWidget,
  TransfersRecentWidget,
  TransfersTableWidget,
} from "@/components/dashboard/widgets/PublicationsDashboardWidgets";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useDashboardDateRange } from "@/context/DashboardDateRangeContext";
import { fetchDashboardStatsForRange } from "@/lib/queries";

export function DashboardPage() {
  const dashboardDateRange = useDashboardDateRange();
  const dateRange = dashboardDateRange?.effectiveRange ?? null;

  const statsQuery = useAsyncData(
    () => fetchDashboardStatsForRange(dateRange),
    [dateRange?.from, dateRange?.to],
  );
  const asyncCounts = useDashboardAsyncCounts(dateRange);

  const loading = statsQuery.loading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pb-6">
        {statsQuery.error ? <ErrorState message={statsQuery.error} /> : null}

        <DashboardSection
          title="Overview"
          description="KPI stats for every dataset. Counts respect the dashboard date range where applicable."
        >
          <DashboardKpiGrid
            stats={statsQuery.data ?? undefined}
            newsCount={asyncCounts.newsCount}
            tvkSectionCount={asyncCounts.tvkSectionCount}
            loading={loading}
            asyncLoading={asyncCounts.loading}
          />
        </DashboardSection>

        <DashboardSection
          title="Govt Publications"
          description="Press releases, press release images, government orders, and IAS transfers."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <PressReleasesRecentWidget dateRange={dateRange} />
            <PressReleasesTrendWidget dateRange={dateRange} />
            <PressReleasesTimelineWidget dateRange={dateRange} />
            <GovPressReleasesRecentWidget dateRange={dateRange} />
            <GovPressReleasesImageGridWidget dateRange={dateRange} />
            <GovernmentOrdersRecentWidget dateRange={dateRange} />
            <GovernmentOrdersTableWidget dateRange={dateRange} />
            <TransfersRecentWidget dateRange={dateRange} />
            <TransfersTableWidget dateRange={dateRange} />
          </div>
        </DashboardSection>

        <DashboardSection
          title="Govt Administration"
          description="Departments, ministers, districts, constituencies, and map previews."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <DepartmentsTilesWidget />
            <MinistersChiefMinisterWidget />
            <DistrictsFeaturedWidget />
            <DistrictsMiniMapWidget />
            <ConstituenciesPartyBreakdownWidget />
            <MapsMetaWidget />
          </div>
        </DashboardSection>

        <DashboardSection
          title="Schemes, Magazine & News"
          description="Government schemes, Tamil Arasu magazine, and Tamil Nadu news previews."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <GovtSchemesPopularWidget />
            <GovtSchemesRecentWidget />
            <MagazineLatestWidget />
            <NewsHeadlinesWidget dateRange={dateRange} />
            <NewsFullPagePreviewWidget dateRange={dateRange} />
          </div>
        </DashboardSection>

        <DashboardSection
          title="TVK Manifesto"
          description="Lazy-loaded manifesto summary and content preview."
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <TvkManifestoSummaryWidget />
            <TvkManifestoPreviewWidget />
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}
