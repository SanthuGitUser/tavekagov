import type { ReactNode } from "react";
import { FilterX, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import { NewsDatePicker } from "@/components/news/NewsDatePicker";
import { GovernmentOrdersViewTabs } from "@/components/government-orders/GovernmentOrdersViewTabs";
import { PartyFilterSelect } from "@/components/constituencies/PartyFilterSelect";
import { GovPressReleaseViewTabs } from "@/components/gov-press-releases/GovPressReleaseViewTabs";
import { PressReleaseViewTabs } from "@/components/press-releases/PressReleaseViewTabs";
import { formatReleaseCount } from "@/components/press-releases/pressReleaseUtils";
import { useGovernmentSearch } from "@/context/GovernmentSearchContext";
import { useConstituencySearch } from "@/context/ConstituencySearchContext";
import { useDistrictSearch } from "@/context/DistrictSearchContext";
import { useGovPressReleaseSearch } from "@/context/GovPressReleaseSearchContext";
import { useGovPressReleaseView } from "@/context/GovPressReleaseViewContext";
import { useGovtSchemesSearch } from "@/context/GovtSchemesSearchContext";
import { filterGovtSchemes, getGovtSchemesForSection } from "@/lib/govtSchemeFilterUtils";
import {
  getGovtSchemeCategories,
  getGovtSchemes,
  tamilNaduGovtSchemesFeed,
} from "@/lib/tamilNaduGovtSchemesFeed";
import { useGovernmentOrdersSearch } from "@/context/GovernmentOrdersSearchContext";
import { useGovernmentOrdersView } from "@/context/GovernmentOrdersViewContext";
import { useMagazineSearch } from "@/context/MagazineSearchContext";
import { useNewsSearch } from "@/context/NewsSearchContext";
import { getConstituencyCategories, getConstituencyDistricts, getConstituencyParties, tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { filterConstituencies } from "@/lib/constituencyFilterUtils";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { getAvailableNewsDates } from "@/lib/tamilNaduNewsFeed";
import { useDvacPressReleaseSearch } from "@/context/DvacPressReleaseSearchContext";
import { usePressReleaseSearch } from "@/context/PressReleaseSearchContext";
import { usePressReleaseView } from "@/context/PressReleaseViewContext";
import { useTransfersPostingsSearch } from "@/context/TransfersPostingsSearchContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardDateRange, type DashboardDateRangePreset } from "@/context/DashboardDateRangeContext";
import { useTVKManifestoSearch } from "@/context/TVKManifestoSearchContext";
import { useMlaSearch } from "@/context/MlaSearchContext";
import {
  countTVKManifestoChildSections,
  filterTVKManifestoGroups,
} from "@/lib/tvkManifestoFilterUtils";
import {
  getTVKManifestoCategoriesFrom,
  getTVKManifestoGroupsFrom,
  loadTVKManifestoFeed,
  type TVKManifestoFeedData,
} from "@/lib/tvkManifestoFeed";
import { tamilNaduMlaFeed } from "@/lib/tamilNaduMlaFeed";

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

function TVKManifestoHeader({
  title,
  description,
  search,
  onSearchChange,
}: {
  title: string;
  description?: ReactNode;
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const [searchParams] = useSearchParams();
  const [feedData, setFeedData] = useState<TVKManifestoFeedData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTVKManifestoFeed()
      .then((data) => {
        if (!cancelled) setFeedData(data);
      })
      .catch(() => {
        if (!cancelled) setFeedData(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rawSelectedCategory = searchParams.get("category") ?? "all";
  const categories = feedData ? getTVKManifestoCategoriesFrom(feedData) : [];
  const selectedCategory =
    rawSelectedCategory === "all" || categories.includes(rawSelectedCategory)
      ? rawSelectedCategory
      : "all";
  const categoryGroups = feedData
    ? getTVKManifestoGroupsFrom(feedData, selectedCategory === "all" ? null : selectedCategory)
    : [];
  const filteredGroups = filterTVKManifestoGroups(categoryGroups, search);
  const filteredSectionCount = countTVKManifestoChildSections(filteredGroups);
  const totalSectionCount = feedData?.sectionCount ?? 0;

  return (
    <HeaderShell>
      <div className={headerInnerClassName}>
        <HeaderTitleBlock title={title} description={description} />
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search manifesto…"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 w-full pl-8"
              aria-label="Search manifesto"
            />
          </div>
          <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
            {filteredGroups.length} group{filteredGroups.length === 1 ? "" : "s"} · {filteredSectionCount} of{" "}
            {totalSectionCount} sections
          </p>
        </div>
      </div>
    </HeaderShell>
  );
}

export function Header({ title, description }: HeaderProps) {
  const dvacPressReleaseSearch = useDvacPressReleaseSearch();
  const pressReleaseSearch = usePressReleaseSearch();
  const pressReleaseView = usePressReleaseView();
  const govPressReleaseSearch = useGovPressReleaseSearch();
  const govPressReleaseView = useGovPressReleaseView();
  const governmentOrdersSearch = useGovernmentOrdersSearch();
  const magazineSearch = useMagazineSearch();
  const newsSearch = useNewsSearch();
  const constituencySearch = useConstituencySearch();
  const districtSearch = useDistrictSearch();
  const governmentSearch = useGovernmentSearch();
  const govtSchemesSearch = useGovtSchemesSearch();
  const governmentOrdersView = useGovernmentOrdersView();
  const transfersPostingsSearch = useTransfersPostingsSearch();
  const tvkManifestoSearch = useTVKManifestoSearch();
  const mlaSearch = useMlaSearch();
  const dashboardDateRange = useDashboardDateRange();
  const location = useLocation();
  const pageSearch =
    pressReleaseSearch
    ?? govPressReleaseSearch
    ?? governmentOrdersSearch
    ?? transfersPostingsSearch
    ?? magazineSearch
    ?? newsSearch
    ?? districtSearch
    ?? constituencySearch
    ?? governmentSearch
    ?? govtSchemesSearch;

  const isMinistersPage = location.pathname === "/ministers";
  const isDepartmentsPage = location.pathname === "/departments";

  let searchPlaceholder = constituencySearch
    ? "Search constituencies…"
    : districtSearch
    ? "Search districts…"
    : governmentSearch
      ? isDepartmentsPage
        ? "Search departments…"
        : isMinistersPage
          ? "Search ministers…"
          : "Search ministers or departments…"
        : govtSchemesSearch
          ? "Search schemes…"
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

  let searchAriaLabel = constituencySearch
    ? "Search constituencies"
    : districtSearch
    ? "Search districts"
    : governmentSearch
      ? isDepartmentsPage
        ? "Search departments"
        : isMinistersPage
          ? "Search ministers"
          : "Search ministers and departments"
        : govtSchemesSearch
          ? "Search schemes"
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

  if (tvkManifestoSearch) {
    return (
      <TVKManifestoHeader
        title={title}
        description={description}
        search={tvkManifestoSearch.search}
        onSearchChange={tvkManifestoSearch.setSearch}
      />
    );
  }

  if (dvacPressReleaseSearch) {
    const latestMonth = dvacPressReleaseSearch.availableMonths[0] ?? "";
    const selectedMonth = dvacPressReleaseSearch.selectedMonth || latestMonth;

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
            <MonthPicker
              value={selectedMonth}
              onChange={dvacPressReleaseSearch.setSelectedMonth}
              availableMonths={dvacPressReleaseSearch.availableMonths}
            />
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search DVAC releases…"
                value={dvacPressReleaseSearch.search}
                onChange={(event) => dvacPressReleaseSearch.setSearch(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search DVAC press releases"
              />
            </div>
            <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {dvacPressReleaseSearch.filteredCount} shown · {dvacPressReleaseSearch.totalCount} total
            </p>
          </div>
        </div>
      </HeaderShell>
    );
  }

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
      "h-9 max-w-[9.5rem] shrink-0 rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";
    const hasActiveFilters =
      constituencySearch.search.trim() !== "" ||
      constituencySearch.districtFilter !== "all" ||
      constituencySearch.partyFilter !== "all" ||
      constituencySearch.categoryFilter !== "all" ||
      constituencySearch.memberFilter !== "all" ||
      constituencySearch.selectedAcNumber !== null;

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
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={constituencySearch.resetFilters}
                disabled={!hasActiveFilters}
                aria-label="Reset all filters"
                title="Reset all filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
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

  if (mlaSearch) {
    function normalizeMlaPartyName(value: string): string {
      const trimmed = value.trim();
      const withoutSuffix = trimmed.replace(/\s+S$/i, "").trim();
      const PARTY_CODE_BY_NAME: Record<string, string> = {
        "Amma Makkal Munnettra Kazagam": "AMMK",
        "Desiya Murpokku Dravida Kazhagam": "DMDK",
        "Indian Union Muslim League": "IUML",
        "Pattali Makkal Katchi": "PMK",
        "Tamilaga Vettri Kazhagam": "TVK",
        "Viduthalai Chiruthaigal Katchi": "VCK",
      };
      return PARTY_CODE_BY_NAME[withoutSuffix] ?? withoutSuffix;
    }

    const parties = [...new Set(tamilNaduMlaFeed.mlas.map((m) => m.party).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
    const normalizedParties = [
      ...new Set(parties.map((party) => normalizeMlaPartyName(party)).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));
    const educations = [
      ...new Set(
        tamilNaduMlaFeed.mlas
          .map((m) => m.education_category || m.education)
          .map((v) => v?.trim())
          .filter(Boolean),
      ),
    ].sort((a, b) => String(a).localeCompare(String(b)));
    const districts = [...new Set(tamilNaduMlaFeed.mlas.map((m) => m.district).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
    const criminalCaseBuckets: Array<{ value: string; label: string }> = [
      { value: "all", label: "All Criminal Cases" },
      { value: "eq:0", label: "0" },
      { value: "lt:10", label: "< 10" },
      { value: "btw:10:19", label: "10 - 19" },
      { value: "btw:20:49", label: "20 - 49" },
      { value: "gte:50", label: "50+" },
      { value: "unknown", label: "Unknown" },
    ];

    function parseRupees(value: string): number | null {
      const text = String(value ?? "").trim();
      if (!text) return null;

      // Common MyNeta formats: "Rs. 1,23,456", "Rs 1,23,456", sometimes just "1,23,456".
      const rsMatch = text.match(/Rs\.?\s*([\d,]+)/i);
      const numberMatch = rsMatch?.[1] ?? text.match(/([\d,]{2,})/)?.[1] ?? null;
      if (!numberMatch) return null;

      const n = Number(numberMatch.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }

    function bucketCrores(value: string): string {
      const rupees = parseRupees(value);
      if (rupees === null) return "Unknown";
      const crores = rupees / 10_000_000;
      if (crores < 1) return "< 1 Cr";
      if (crores < 10) return "1 - 10 Cr";
      if (crores < 100) return "10 - 100 Cr";
      return "100+ Cr";
    }

    const assetBuckets = [
      ...new Set(tamilNaduMlaFeed.mlas.map((m) => bucketCrores(m.total_assets))),
    ].sort((a, b) => a.localeCompare(b));
    const liabilityBuckets = [
      ...new Set(tamilNaduMlaFeed.mlas.map((m) => bucketCrores(m.liabilities))),
    ].sort((a, b) => a.localeCompare(b));

    const filterSelectClassName =
      "h-9 max-w-[11rem] shrink-0 rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

    const hasActiveFilters =
      mlaSearch.search.trim() !== "" ||
      mlaSearch.partyFilter !== "all" ||
      mlaSearch.criminalCasesFilter !== "all" ||
      mlaSearch.educationFilter !== "all" ||
      mlaSearch.assetsFilter !== "all" ||
      mlaSearch.liabilitiesFilter !== "all" ||
      mlaSearch.districtFilter !== "all";

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
            <div className="relative z-20 flex flex-wrap items-center gap-2">
              <PartyFilterSelect
                value={mlaSearch.partyFilter}
                parties={normalizedParties}
                onChange={mlaSearch.setPartyFilter}
                className={filterSelectClassName}
                rootClassName="min-w-[9.5rem]"
              />

              <label className="sr-only" htmlFor="mla-criminal-filter">
                Filter by criminal cases
              </label>
              <select
                id="mla-criminal-filter"
                value={mlaSearch.criminalCasesFilter}
                onChange={(event) => mlaSearch.setCriminalCasesFilter(event.target.value)}
                className={filterSelectClassName}
              >
                {criminalCaseBuckets.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="mla-education-filter">
                Filter by education
              </label>
              <select
                id="mla-education-filter"
                value={mlaSearch.educationFilter}
                onChange={(event) => mlaSearch.setEducationFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All Education</option>
                {educations.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="mla-assets-filter">
                Filter by total assets
              </label>
              <select
                id="mla-assets-filter"
                value={mlaSearch.assetsFilter}
                onChange={(event) => mlaSearch.setAssetsFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All Assets</option>
                {assetBuckets.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="mla-liabilities-filter">
                Filter by liabilities
              </label>
              <select
                id="mla-liabilities-filter"
                value={mlaSearch.liabilitiesFilter}
                onChange={(event) => mlaSearch.setLiabilitiesFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All Liabilities</option>
                {liabilityBuckets.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="mla-district-filter">
                Filter by district
              </label>
              <select
                id="mla-district-filter"
                value={mlaSearch.districtFilter}
                onChange={(event) => mlaSearch.setDistrictFilter(event.target.value)}
                className={filterSelectClassName}
              >
                <option value="all">All Districts ({tamilNaduMlaFeed.mlas.length})</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={mlaSearch.resetFilters}
                disabled={!hasActiveFilters}
                aria-label="Reset all filters"
                title="Reset all filters"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex w-full min-w-0 items-center gap-2 sm:w-48 sm:gap-2 md:w-56">
              <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search constituency, member, party, district…"
                value={mlaSearch.search}
                onChange={(event) => mlaSearch.setSearch(event.target.value)}
                className="h-9 w-full pl-8"
                aria-label="Search MLAs"
              />
              </div>
              <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                {tamilNaduMlaFeed.mlas.length} total
              </p>
            </div>
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (govtSchemesSearch) {
    const schemes = getGovtSchemes();
    const sectionSchemes = getGovtSchemesForSection(schemes, govtSchemesSearch.sectionFilter);
    const categories = getGovtSchemeCategories(sectionSchemes);
    const filteredCount = filterGovtSchemes(schemes, {
      search: govtSchemesSearch.search,
      sectionFilter: govtSchemesSearch.sectionFilter,
      categoryFilter: govtSchemesSearch.categoryFilter,
    }).length;
    const filterSelectClassName =
      "h-9 max-w-[11rem] shrink-0 rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

    return (
      <HeaderShell>
        <div className={headerInnerClassName}>
          <HeaderTitleBlock title={title} description={description} />
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1 sm:justify-end">
            <div className="inline-flex shrink-0 rounded-full bg-muted/80 p-1 shadow-inner">
              {(
                [
                  { value: "state", label: `Schemes (${tamilNaduGovtSchemesFeed.stateCount})` },
                  { value: "housing", label: `Housing (${tamilNaduGovtSchemesFeed.housingCount})` },
                  {
                    value: "scholarships",
                    label: `Scholarships (${tamilNaduGovtSchemesFeed.scholarshipsCount})`,
                  },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => govtSchemesSearch.setSectionFilter(option.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    govtSchemesSearch.sectionFilter === option.value
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="govt-scheme-category-filter">
              Filter by category
            </label>
            <select
              id="govt-scheme-category-filter"
              value={govtSchemesSearch.categoryFilter}
              onChange={(event) => govtSchemesSearch.setCategoryFilter(event.target.value)}
              className={filterSelectClassName}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <p className="shrink-0 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {filteredCount} of {sectionSchemes.length} schemes
            </p>
            <div className="relative min-w-0 flex-1 sm:max-w-sm">{searchField}</div>
          </div>
        </div>
      </HeaderShell>
    );
  }

  if (magazineSearch || districtSearch || governmentSearch) {
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
