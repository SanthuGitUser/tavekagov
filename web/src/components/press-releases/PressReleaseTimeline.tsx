import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GovPressReleaseSideFilters } from "@/components/gov-press-releases/GovPressReleaseSideFilters";
import {
  formatPrNumber,
  getLatestValidDate,
  VerticalDatePicker,
} from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import { usePressReleaseSearch } from "@/context/PressReleaseSearchContext";
import type { PressRelease, TnDept, TnMinister } from "@/types/models";

import { CrossDatePressReleaseBrowse } from "./CrossDatePressReleaseBrowse";
import { PressReleaseViewTabs } from "./PressReleaseViewTabs";
import {
  buildDepartmentSideOptions,
  buildMinisterSideOptions,
  formatReleaseCount,
  groupReleasesByDate,
  matchesSearch,
  type PressReleaseView,
} from "./pressReleaseUtils";

type PressReleaseTimelineProps = {
  releases: PressRelease[];
  departments: TnDept[];
  ministers: TnMinister[];
};

function parseReleaseDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function parsePrNumber(value: string | null): number | null {
  const formatted = formatPrNumber(value);
  if (!formatted) return null;
  const parsed = Number.parseInt(formatted, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareByPrNumber(a: PressRelease, b: PressRelease): number {
  const aNo = parsePrNumber(a.dipr_pr_no);
  const bNo = parsePrNumber(b.dipr_pr_no);

  if (aNo === null && bNo === null) return a.name.localeCompare(b.name);
  if (aNo === null) return 1;
  if (bNo === null) return -1;
  if (aNo !== bNo) return aNo - bNo;
  return a.name.localeCompare(b.name);
}

function ReleaseCard({
  release,
  departmentsById,
  ministersById,
}: {
  release: PressRelease;
  departmentsById: Map<number, TnDept>;
  ministersById: Map<number, TnMinister>;
}) {
  const prNumber = formatPrNumber(release.dipr_pr_no);
  const department =
    release.department_id != null ? departmentsById.get(release.department_id) : undefined;
  const minister =
    release.minister_id != null ? ministersById.get(release.minister_id) : undefined;

  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-accent/60">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-sm font-medium leading-snug text-foreground">{release.name}</h3>
          {release.topic || release.release_type || department || minister ? (
            <div className="flex flex-wrap gap-1.5">
              {release.release_type ? (
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {release.release_type}
                </Badge>
              ) : null}
              {department ? (
                <Badge variant="outline" className="text-[11px] font-normal">
                  {department.name}
                </Badge>
              ) : release.department_name ? (
                <Badge variant="outline" className="text-[11px] font-normal">
                  {release.department_name}
                </Badge>
              ) : null}
              {minister ? (
                <Badge variant="outline" className="text-[11px] font-normal">
                  {minister.name}
                </Badge>
              ) : null}
              {release.topic ? (
                <span className="text-xs text-muted-foreground line-clamp-1">{release.topic}</span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {prNumber ? (
            <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
              {prNumber}
            </Badge>
          ) : null}
          <a
            href={release.pdf_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:underline"
          >
            Open PDF <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function PressReleaseTimeline({
  releases,
  departments,
  ministers,
}: PressReleaseTimelineProps) {
  const pressReleaseSearch = usePressReleaseSearch();
  const search = pressReleaseSearch?.search ?? "";

  const [view, setView] = useState<PressReleaseView>("all");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [ministerId, setMinisterId] = useState<number | null>(null);
  const [departmentListSearch, setDepartmentListSearch] = useState("");
  const [ministerListSearch, setMinisterListSearch] = useState("");

  const allDates = useMemo(
    () => [...new Set(releases.map((release) => release.pr_date))],
    [releases],
  );

  const departmentSideOptions = useMemo(
    () => buildDepartmentSideOptions(releases, departments),
    [releases, departments],
  );

  const ministersById = useMemo(
    () => new Map(ministers.map((minister) => [minister.id, minister])),
    [ministers],
  );

  const departmentsById = useMemo(
    () => new Map(departments.map((department) => [department.id, department])),
    [departments],
  );

  const ministerSideOptions = useMemo(
    () => buildMinisterSideOptions(releases, ministers),
    [releases, ministers],
  );

  const filteredDepartmentSideOptions = useMemo(() => {
    const query = departmentListSearch.trim().toLowerCase();
    if (!query) return departmentSideOptions;
    return departmentSideOptions.filter((option) =>
      option.label.toLowerCase().includes(query),
    );
  }, [departmentSideOptions, departmentListSearch]);

  const filteredMinisterSideOptions = useMemo(() => {
    const query = ministerListSearch.trim().toLowerCase();
    if (!query) return ministerSideOptions;
    return ministerSideOptions.filter((option) => option.label.toLowerCase().includes(query));
  }, [ministerSideOptions, ministerListSearch]);

  useEffect(() => {
    if (view !== "department") setDepartmentListSearch("");
    if (view !== "minister") setMinisterListSearch("");
  }, [view]);

  useEffect(() => {
    if (view !== "department") return;
    if (departmentId != null && departmentSideOptions.some((o) => o.id === String(departmentId))) {
      return;
    }
    setDepartmentId(
      departmentSideOptions[0] ? Number.parseInt(departmentSideOptions[0].id, 10) : null,
    );
  }, [view, departmentId, departmentSideOptions]);

  useEffect(() => {
    if (view !== "minister") return;
    if (ministerId != null && ministerSideOptions.some((o) => o.id === String(ministerId))) {
      return;
    }
    setMinisterId(ministerSideOptions[0] ? Number.parseInt(ministerSideOptions[0].id, 10) : null);
  }, [view, ministerId, ministerSideOptions]);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const isDateBrowse = view === "all" && !isSearching;

  const filteredReleases = useMemo(() => {
    let rows = releases.filter((release) => matchesSearch(release, query));

    if (view === "department" && departmentId != null) {
      rows = rows.filter((release) => release.department_id === departmentId);
    } else if (view === "minister" && ministerId != null) {
      rows = rows.filter((release) => release.minister_id === ministerId);
    }

    return rows.sort((a, b) => {
      const dateCompare = b.pr_date.localeCompare(a.pr_date);
      if (dateCompare !== 0) return dateCompare;
      return compareByPrNumber(a, b);
    });
  }, [releases, query, view, departmentId, ministerId]);

  const filteredReleasesByDate = useMemo(
    () => groupReleasesByDate(filteredReleases),
    [filteredReleases],
  );

  const latestDate = useMemo(() => getLatestValidDate(allDates), [allDates]);
  const [selectedDate, setSelectedDate] = useState<string>(latestDate ?? "");

  useEffect(() => {
    if (latestDate) setSelectedDate(latestDate);
  }, [latestDate]);

  useEffect(() => {
    if (selectedDate && !allDates.includes(selectedDate) && latestDate) {
      setSelectedDate(latestDate);
    }
  }, [allDates, latestDate, selectedDate]);

  const releasesForDate = useMemo(() => {
    return releases
      .filter((release) => release.pr_date === selectedDate)
      .filter((release) => matchesSearch(release, query))
      .sort(compareByPrNumber);
  }, [releases, selectedDate, query]);

  const browseTitle = useMemo(() => {
    if (isSearching) return "Search results";
    if (view === "department") {
      return (
        departmentSideOptions.find((o) => o.id === String(departmentId))?.label ?? "Department"
      );
    }
    if (view === "minister") {
      return ministerSideOptions.find((o) => o.id === String(ministerId))?.label ?? "Minister";
    }
    return "All releases";
  }, [isSearching, view, departmentId, ministerId, departmentSideOptions, ministerSideOptions]);

  const browseSubtitle = `${formatReleaseCount(filteredReleases.length)} total · ${filteredReleasesByDate.length} ${filteredReleasesByDate.length === 1 ? "date" : "dates"}`;

  if (!latestDate && releases.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No press releases found.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0">
        <PressReleaseViewTabs view={view} onViewChange={setView} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
        {view === "department" || view === "minister" ? (
          <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[220px] xl:w-[240px]">
            {view === "department" ? (
              <GovPressReleaseSideFilters
                title="Departments"
                options={filteredDepartmentSideOptions}
                selectedId={departmentId != null ? String(departmentId) : null}
                onSelect={(id) => setDepartmentId(Number.parseInt(id, 10))}
                listClassName="max-h-[min(50vh,420px)]"
                search={departmentListSearch}
                onSearchChange={setDepartmentListSearch}
                searchPlaceholder="Search departments…"
                emptyMessage="No departments match your search."
              />
            ) : null}

            {view === "minister" ? (
              <GovPressReleaseSideFilters
                title="Ministers"
                options={filteredMinisterSideOptions}
                selectedId={ministerId != null ? String(ministerId) : null}
                onSelect={(id) => setMinisterId(Number.parseInt(id, 10))}
                listClassName="max-h-[min(50vh,420px)]"
                search={ministerListSearch}
                onSearchChange={setMinisterListSearch}
                searchPlaceholder="Search ministers…"
                emptyMessage="No ministers match your search."
              />
            ) : null}
          </aside>
        ) : null}

        {isDateBrowse ? (
          <>
            <aside className="flex shrink-0 flex-col items-center">
              <p className="mb-1.5 w-[128px] text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Select date
              </p>
              <VerticalDatePicker
                availableDates={allDates}
                value={selectedDate}
                onChange={setSelectedDate}
              />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="mb-3 shrink-0">
                <h2 className="text-lg font-bold tracking-tight">
                  {format(parseReleaseDate(selectedDate), "EEEE, d MMMM yyyy")}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatReleaseCount(releasesForDate.length)} on this date ·{" "}
                  {formatReleaseCount(releases.length)} total
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {releasesForDate.length === 0 ? (
                  <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                    No press releases on this date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {releasesForDate.map((release) => (
                      <ReleaseCard
                        key={release.id}
                        release={release}
                        departmentsById={departmentsById}
                        ministersById={ministersById}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <CrossDatePressReleaseBrowse
            title={browseTitle}
            subtitle={browseSubtitle}
            emptyMessage={
              isSearching
                ? "No press releases match your search."
                : view === "department"
                  ? "No press releases for this department."
                  : view === "minister"
                    ? "No press releases for this minister."
                    : "No press releases found."
            }
            groups={filteredReleasesByDate}
            renderRelease={(release) => (
              <ReleaseCard
                key={release.id}
                release={release}
                departmentsById={departmentsById}
                ministersById={ministersById}
              />
            )}
          />
        )}
      </div>
    </div>
  );
}
