import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { NewsDatePicker } from "@/components/news/NewsDatePicker";
import { GovernmentOrdersViewTabs } from "@/components/government-orders/GovernmentOrdersViewTabs";
import { PartyFilterSelect } from "@/components/constituencies/PartyFilterSelect";
import { GovPressReleaseViewTabs } from "@/components/gov-press-releases/GovPressReleaseViewTabs";
import { PressReleaseViewTabs } from "@/components/press-releases/PressReleaseViewTabs";
import { formatReleaseCount } from "@/components/press-releases/pressReleaseUtils";
import { useDepartmentSearch } from "@/context/DepartmentSearchContext";
import { useConstituencySearch } from "@/context/ConstituencySearchContext";
import { useDistrictSearch } from "@/context/DistrictSearchContext";
import { useGovPressReleaseSearch } from "@/context/GovPressReleaseSearchContext";
import { useGovPressReleaseView } from "@/context/GovPressReleaseViewContext";
import { useMinisterSearch } from "@/context/MinisterSearchContext";
import { useGovernmentOrdersSearch } from "@/context/GovernmentOrdersSearchContext";
import { useGovernmentOrdersView } from "@/context/GovernmentOrdersViewContext";
import { useMagazineSearch } from "@/context/MagazineSearchContext";
import { useNewsSearch } from "@/context/NewsSearchContext";
import { getConstituencyCategories, getConstituencyDistricts, getConstituencyParties, tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { filterConstituencies } from "@/lib/constituencyFilterUtils";
import { getAvailableNewsDates } from "@/lib/tamilNaduNewsFeed";
import { usePressReleaseSearch } from "@/context/PressReleaseSearchContext";
import { usePressReleaseView } from "@/context/PressReleaseViewContext";
import { useTransfersPostingsSearch } from "@/context/TransfersPostingsSearchContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDashboardDateRange, type DashboardDateRangePreset } from "@/context/DashboardDateRangeContext";

type HeaderProps = {
  title: string;
  description?: ReactNode;
};

const headerShellClassName = "border-b border-border bg-card px-3 py-3 sm:px-4";
const headerInnerClassName =
  "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

function HeaderShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(headerShellClassName, "relative z-20", className)}>{children}</div>;
}

function HeaderTitleBlock({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function HeaderTitleWithTabs({
  title,
  description,
  tabs,
}: {
  title: string;
  description?: ReactNode;
  tabs: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
      <HeaderTitleBlock title={title} description={description} />
      {tabs}
    </div>
  );
}

export function Header({ title, description }: HeaderProps) {
  const pressReleaseSearch = usePressReleaseSearch();
  const pressReleaseView = usePressReleaseView();
  const govPressReleaseSearch = useGovPressReleaseSearch();
  const govPressReleaseView = useGovPressReleaseView();
  const governmentOrdersSearch = useGovernmentOrdersSearch();
  const magazineSearch = useMagazineSearch();
  const newsSearch = useNewsSearch();
  const constituencySearch = useConstituencySearch();
  const districtSearch = useDistrictSearch();
  const departmentSearch = useDepartmentSearch();
  const ministerSearch = useMinisterSearch();
  const governmentOrdersView = useGovernmentOrdersView();
  const transfersPostingsSearch = useTransfersPostingsSearch();
  const dashboardDateRange = useDashboardDateRange();
  const pageSearch =
    pressReleaseSearch
    ?? govPressReleaseSearch
    ?? governmentOrdersSearch
    ?? transfersPostingsSearch
    ?? magazineSearch
    ?? newsSearch
    ?? districtSearch
    ?? constituencySearch
    ?? departmentSearch
    ?? ministerSearch;

  const searchPlaceholder = constituencySearch
    ? "Search constituencies…"
    : districtSearch
    ? "Search districts…"
    : departmentSearch
      ? "Search departments…"
      : ministerSearch
        ? "Search ministers…"
        : magazineSearch
          ? "Search magazines…"
          : newsSearch
            ? "Search news…"
            : governmentOrdersSearch
              ? "Search all government orders…"
              : transfersPostingsSearch
                ? "Search transfers and postings…"
                : govPressReleaseSearch
                  ? "Search press release images…"
                  : "Search all press releases…";

  const searchAriaLabel = constituencySearch
    ? "Search constituencies"
    : districtSearch
    ? "Search districts"
    : departmentSearch
      ? "Search departments"
      : ministerSearch
        ? "Search ministers"
        : magazineSearch
          ? "Search magazines"
          : newsSearch
            ? "Search news"
            : governmentOrdersSearch
              ? "Search government orders"
              : transfersPostingsSearch
                ? "Search transfers and postings"
                : govPressReleaseSearch
                  ? "Search press release images"
                  : "Search press releases";

  const searchField = pageSearch ? (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={searchPlaceholder}
        value={pageSearch.search}
        onChange={(event) => pageSearch.setSearch(event.target.value)}
        className="h-9 pl-8"
        aria-label={searchAriaLabel}
      />
    </div>
  ) : null;

  const dashboardRangeControl =
    title === "Dashboard" && dashboardDateRange ? (
      <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
        <select
          value={dashboardDateRange.preset}
          onChange={(event) => dashboardDateRange.setPreset(event.target.value as DashboardDateRangePreset)}
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="Dashboard date range"
        >
          <option value="all">All</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="3m">Last 3 Months</option>
          <option value="6m">Last 6 Months</option>
          <option value="custom">Custom range</option>
        </select>
        {dashboardDateRange.preset === "custom" ? (
          <NewsDatePicker
            value={dashboardDateRange.customRange}
            onChange={dashboardDateRange.setCustomRange}
          />
        ) : null}
      </div>
    ) : null;

  if (transfersPostingsSearch) {
    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[20rem] sm:flex-1 sm:justify-end">
            <NewsDatePicker
              value={transfersPostingsSearch.filterDateRange}
              onChange={transfersPostingsSearch.setFilterDateRange}
              availableDates={transfersPostingsSearch.availableDates}
              navigateAvailableDatesOnly
            />
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search transfers and postings…"
                value={transfersPostingsSearch.search}
                onChange={(event) => transfersPostingsSearch.setSearch(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search transfers and postings"
              />
            </div>
            <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {transfersPostingsSearch.filteredCount} transfer
              {transfersPostingsSearch.filteredCount === 1 ? "" : "s"} shown ·{" "}
              {transfersPostingsSearch.totalCount} total
            </p>
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (newsSearch) {
    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search news…"
                value={newsSearch.search}
                onChange={(event) => newsSearch.setSearch(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search news"
              />
            </div>
            <NewsDatePicker
              value={newsSearch.filterDateRange}
              onChange={newsSearch.setFilterDateRange}
              availableDates={getAvailableNewsDates()}
            />
            <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {newsSearch.filteredCount} stories shown · {newsSearch.totalCount} total
            </p>
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (constituencySearch) {
    const constituencies = tamilNaduAssemblyConstituenciesFeed.constituencies;
    const districts = getConstituencyDistricts();
    const parties = getConstituencyParties();
    const categories = getConstituencyCategories();
    const filteredCount = filterConstituencies(constituencies, {
      search: constituencySearch.search,
      districtFilter: constituencySearch.districtFilter,
      partyFilter: constituencySearch.partyFilter,
      categoryFilter: constituencySearch.categoryFilter,
      memberFilter: constituencySearch.memberFilter,
    }).length;
    const filterSelectClassName =
      "h-9 max-w-[11rem] shrink-0 rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
            <div className="relative z-20 flex flex-wrap items-center gap-2">
              <PartyFilterSelect
                value={constituencySearch.partyFilter}
                parties={parties}
                onChange={constituencySearch.setPartyFilter}
                className={filterSelectClassName}
              />
              <label className="sr-only" htmlFor="constituency-member-filter">
                Filter by member type
              </label>
              <select
                id="constituency-member-filter"
                value={constituencySearch.memberFilter}
                onChange={(event) => constituencySearch.setMemberFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All members</option>
                <option value="minister">Minister</option>
                <option value="mla">MLA</option>
              </select>
              <label className="sr-only" htmlFor="constituency-category-filter">
                Filter by category
              </label>
              <select
                id="constituency-category-filter"
                value={constituencySearch.categoryFilter}
                onChange={(event) => constituencySearch.setCategoryFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="constituency-district-filter">
                Filter by district
              </label>
              <select
                id="constituency-district-filter"
                value={constituencySearch.districtFilter}
                onChange={(event) => constituencySearch.setDistrictFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All districts ({constituencies.length})</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative w-full min-w-0 sm:w-48 md:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search constituencies…"
                value={constituencySearch.search}
                onChange={(event) => constituencySearch.setSearch(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search constituencies"
              />
            </div>
            <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {filteredCount} of {constituencies.length} constituencies
            </p>
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (magazineSearch || districtSearch || departmentSearch || ministerSearch) {
    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="w-full sm:w-72 sm:shrink-0">{searchField}</div>
        </div>
      </HeaderShell>
    );
  }

  if (pressReleaseSearch && pressReleaseView) {
    const showAllViewControls =
      pressReleaseView.viewMode === "all" && pressReleaseView.selectedDateRange.from;

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleWithTabs
            title={title}
            description={description}
            tabs={
              <PressReleaseViewTabs
                viewMode={pressReleaseView.viewMode}
                onViewModeChange={pressReleaseView.setViewMode}
                className="shrink-0"
              />
            }
          />

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[20rem] sm:flex-1 sm:justify-end">
            {showAllViewControls ? (
              <>
                <NewsDatePicker
                  value={pressReleaseView.selectedDateRange}
                  onChange={pressReleaseView.setSelectedDateRange}
                  availableDates={pressReleaseView.availableDates}
                  navigateAvailableDatesOnly
                />
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search all press releases…"
                    value={pressReleaseSearch.search}
                    onChange={(event) => pressReleaseSearch.setSearch(event.target.value)}
                    className="h-9 w-full pl-8"
                    aria-label="Search press releases"
                  />
                </div>
                <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {formatReleaseCount(pressReleaseView.selectedDateReleaseCount)}
                  {pressReleaseView.selectedDateRange.from === pressReleaseView.selectedDateRange.to
                    ? " on this date"
                    : " in range"}{" "}
                  · {formatReleaseCount(pressReleaseView.totalReleaseCount)} total
                </p>
              </>
            ) : (
              searchField
            )}
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (govPressReleaseSearch && govPressReleaseView) {
    const showAllViewControls =
      govPressReleaseView.viewMode === "all" && govPressReleaseView.selectedDateRange.from;
    const showBrowseViewControls =
      govPressReleaseView.viewMode === "department" ||
      govPressReleaseView.viewMode === "minister";

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleWithTabs
            title={title}
            description={description}
            tabs={
              <GovPressReleaseViewTabs
                viewMode={govPressReleaseView.viewMode}
                onViewModeChange={govPressReleaseView.setViewMode}
                className="shrink-0"
              />
            }
          />

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[20rem] sm:flex-1 sm:justify-end">
            {showAllViewControls ? (
              <>
                <NewsDatePicker
                  value={govPressReleaseView.selectedDateRange}
                  onChange={govPressReleaseView.setSelectedDateRange}
                  availableDates={govPressReleaseView.availableDates}
                  navigateAvailableDatesOnly
                />
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search press release images…"
                    value={govPressReleaseSearch.search}
                    onChange={(event) => govPressReleaseSearch.setSearch(event.target.value)}
                    className="h-9 w-full pl-8"
                    aria-label="Search press release images"
                  />
                </div>
                <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                  {govPressReleaseView.selectedDateReleaseCount} image
                  {govPressReleaseView.selectedDateReleaseCount === 1 ? "" : "s"}
                  {govPressReleaseView.selectedDateRange.from === govPressReleaseView.selectedDateRange.to
                    ? " shown"
                    : " in range"}
                </p>
              </>
            ) : showBrowseViewControls ? (
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search press release images…"
                  value={govPressReleaseSearch.search}
                  onChange={(event) => govPressReleaseSearch.setSearch(event.target.value)}
                  className="h-9 w-full pl-8"
                  aria-label="Search press release images"
                />
              </div>
            ) : (
              searchField
            )}
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (governmentOrdersSearch && governmentOrdersView) {
    const showCalendarControls = governmentOrdersView.viewMode === "calendar";
    const pickerValue =
      governmentOrdersSearch.filterDateRange.from && governmentOrdersSearch.filterDateRange.to
        ? governmentOrdersSearch.filterDateRange
        : {
            from: governmentOrdersSearch.availableDates[0] ?? "",
            to: governmentOrdersSearch.availableDates[0] ?? "",
          };

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleWithTabs
            title={title}
            description={description}
            tabs={
              <GovernmentOrdersViewTabs
                viewMode={governmentOrdersView.viewMode}
                onViewModeChange={governmentOrdersView.setViewMode}
                className="shrink-0"
              />
            }
          />

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[20rem] sm:flex-1 sm:justify-end">
            {showCalendarControls ? (
              <NewsDatePicker
                value={pickerValue}
                onChange={governmentOrdersSearch.setFilterDateRange}
                availableDates={governmentOrdersSearch.availableDates}
                navigateAvailableDatesOnly
              />
            ) : null}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search all government orders…"
                value={governmentOrdersSearch.search}
                onChange={(event) => governmentOrdersSearch.setSearch(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search government orders"
              />
            </div>
            <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {governmentOrdersSearch.filteredCount} order
              {governmentOrdersSearch.filteredCount === 1 ? "" : "s"} shown ·{" "}
              {governmentOrdersSearch.totalCount} total
            </p>
          </div>
        </div>
      </HeaderShell>
    );
  }

  return (
    <HeaderShell>
      <div className={headerInnerClassName}>
        <HeaderTitleBlock title={title} description={description} />
        {dashboardRangeControl ?? searchField}
      </div>
    </HeaderShell>
  );
}
