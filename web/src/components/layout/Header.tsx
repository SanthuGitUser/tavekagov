import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { NewsDatePicker } from "@/components/news/NewsDatePicker";
import { useDepartmentSearch } from "@/context/DepartmentSearchContext";
import { useDistrictSearch } from "@/context/DistrictSearchContext";
import { useGovPressReleaseSearch } from "@/context/GovPressReleaseSearchContext";
import { useMinisterSearch } from "@/context/MinisterSearchContext";
import { useGovernmentOrdersSearch } from "@/context/GovernmentOrdersSearchContext";
import { useGovernmentOrdersView } from "@/context/GovernmentOrdersViewContext";
import { useMagazineSearch } from "@/context/MagazineSearchContext";
import { useNewsSearch } from "@/context/NewsSearchContext";
import { getAvailableNewsDates } from "@/lib/tamilNaduNewsFeed";
import { usePressReleaseSearch } from "@/context/PressReleaseSearchContext";
import { useTransfersPostingsSearch } from "@/context/TransfersPostingsSearchContext";
import { Input } from "@/components/ui/input";

type HeaderProps = {
  title: string;
  description?: ReactNode;
};

export function Header({ title, description }: HeaderProps) {
  const pressReleaseSearch = usePressReleaseSearch();
  const govPressReleaseSearch = useGovPressReleaseSearch();
  const governmentOrdersSearch = useGovernmentOrdersSearch();
  const magazineSearch = useMagazineSearch();
  const newsSearch = useNewsSearch();
  const districtSearch = useDistrictSearch();
  const departmentSearch = useDepartmentSearch();
  const ministerSearch = useMinisterSearch();
  const governmentOrdersView = useGovernmentOrdersView();
  const transfersPostingsSearch = useTransfersPostingsSearch();
  const pageSearch =
    pressReleaseSearch
    ?? govPressReleaseSearch
    ?? governmentOrdersSearch
    ?? transfersPostingsSearch
    ?? magazineSearch
    ?? newsSearch
    ?? districtSearch
    ?? departmentSearch
    ?? ministerSearch;

  const searchPlaceholder = districtSearch
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

  const searchAriaLabel = districtSearch
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

  if (newsSearch) {
    return (
      <div className="border-b border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="relative w-52 shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search news…"
                value={newsSearch.search}
                onChange={(event) => newsSearch.setSearch(event.target.value)}
                className="h-9 pl-8"
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
      </div>
    );
  }

  if (magazineSearch || districtSearch || departmentSearch || ministerSearch) {
    return (
      <div className="border-b border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <div className="w-full sm:w-72 sm:shrink-0 sm:self-start sm:flex sm:justify-end">
            {searchField}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-card px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-0.5 max-w-3xl text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {governmentOrdersView ? (
            <div className="inline-flex overflow-hidden rounded-lg border border-border bg-muted/15">
              <button
                type="button"
                onClick={() => governmentOrdersView.setViewMode("calendar")}
                className={
                  "px-3 py-1.5 text-xs font-medium transition-colors " +
                  (governmentOrdersView.viewMode === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
                }
              >
                Calendar View
              </button>
              <button
                type="button"
                onClick={() => governmentOrdersView.setViewMode("department")}
                className={
                  "border-l border-border/60 px-3 py-1.5 text-xs font-medium transition-colors " +
                  (governmentOrdersView.viewMode === "department"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")
                }
              >
                Department View
              </button>
            </div>
          ) : null}
        </div>
        {searchField}
      </div>
    </div>
  );
}
