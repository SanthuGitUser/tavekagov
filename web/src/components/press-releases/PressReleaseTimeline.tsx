import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { GovPressReleaseSideFilters } from "@/components/gov-press-releases/GovPressReleaseSideFilters";
import {
  formatNewsDateRangeLabel,
  isDateInNewsRange,
} from "@/components/news/NewsDatePicker";
import {
  formatPrNumber,
  getLatestValidDate,
} from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import { usePressReleaseSearch } from "@/context/PressReleaseSearchContext";
import { usePressReleaseView } from "@/context/PressReleaseViewContext";
import type { PressRelease, TnDept, TnMinister } from "@/types/models";

import { CrossDatePressReleaseBrowse } from "./CrossDatePressReleaseBrowse";
import {
  buildDepartmentSideOptions,
  buildMinisterSideOptions,
  comparePressReleases,
  formatReleaseCount,
  groupReleasesByDate,
  matchesSearch,
} from "./pressReleaseUtils";

type PressReleaseTimelineProps = {
  releases: PressRelease[];
  departments: TnDept[];
  ministers: TnMinister[];
};

function parseReleaseDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveMinisterFromName(
  ministerName: string | null | undefined,
  ministersByKey: Record<string, TnMinister>,
): TnMinister | null {
  if (!ministerName) return null;
  const target = normalizeKey(ministerName);
  const exact = ministersByKey[target];
  if (exact) return exact;

  const keys = Object.keys(ministersByKey);
  const partial = keys.find((key) => key.includes(target) || target.includes(key));
  return partial ? ministersByKey[partial] : null;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || value.trim().charAt(0).toUpperCase();
}

function ReleaseCard({ release }: { release: PressRelease }) {
  const prNumber = formatPrNumber(release.dipr_pr_no);

  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-accent/60">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug text-foreground">{release.name}</h3>
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
  const pressReleaseView = usePressReleaseView();
  const search = pressReleaseSearch?.search ?? "";
  const view = pressReleaseView?.viewMode ?? "all";
  const selectedDateRange = pressReleaseView?.selectedDateRange ?? { from: "", to: "" };
  const setSelectedDateRange = pressReleaseView?.setSelectedDateRange;
  const setAvailableDates = pressReleaseView?.setAvailableDates;
  const setSelectedDateReleaseCount = pressReleaseView?.setSelectedDateReleaseCount;
  const setTotalReleaseCount = pressReleaseView?.setTotalReleaseCount;
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [ministerId, setMinisterId] = useState<number | null>(null);
  const [departmentListSearch, setDepartmentListSearch] = useState("");
  const [ministerListSearch, setMinisterListSearch] = useState("");

  const allDates = useMemo(
    () => [...new Set(releases.map((release) => release.pr_date))],
    [releases],
  );

  const departmentSideOptions = useMemo(() => {
    const latestByDepartmentId = new Map<number, string>();
    for (const release of releases) {
      if (release.department_id == null) continue;
      const existing = latestByDepartmentId.get(release.department_id);
      if (!existing || release.pr_date > existing) {
        latestByDepartmentId.set(release.department_id, release.pr_date);
      }
    }

    return buildDepartmentSideOptions(releases, departments).sort((a, b) => {
      const leftDate = latestByDepartmentId.get(Number(a.id)) ?? "";
      const rightDate = latestByDepartmentId.get(Number(b.id)) ?? "";
      return (
        rightDate.localeCompare(leftDate) ||
        b.count - a.count ||
        a.label.localeCompare(b.label)
      );
    });
  }, [releases, departments]);

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

    return rows.sort(comparePressReleases);
  }, [releases, query, view, departmentId, ministerId]);

  const datesForPicker = allDates;

  const latestDate = useMemo(() => getLatestValidDate(datesForPicker), [datesForPicker]);

  useEffect(() => {
    setAvailableDates?.(datesForPicker);
  }, [datesForPicker, setAvailableDates]);

  useEffect(() => {
    if (latestDate && !selectedDateRange.from) {
      setSelectedDateRange?.({ from: latestDate, to: latestDate });
    }
  }, [latestDate, selectedDateRange.from, setSelectedDateRange]);

  useEffect(() => {
    if (
      selectedDateRange.from
      && allDates.length > 0
      && !allDates.includes(selectedDateRange.from)
      && latestDate
    ) {
      setSelectedDateRange?.({ from: latestDate, to: latestDate });
    }
  }, [allDates, latestDate, selectedDateRange.from, setSelectedDateRange]);

  const filteredReleasesByDate = useMemo(
    () => groupReleasesByDate(filteredReleases),
    [filteredReleases],
  );

  const releasesInRange = useMemo(() => {
    return releases
      .filter((release) => isDateInNewsRange(release.pr_date, selectedDateRange))
      .filter((release) => matchesSearch(release, query))
      .sort(comparePressReleases);
  }, [releases, selectedDateRange, query]);

  const releasesByDateInRange = useMemo(
    () => groupReleasesByDate(releasesInRange),
    [releasesInRange],
  );

  const isSingleDayRange =
    selectedDateRange.from === selectedDateRange.to && Boolean(selectedDateRange.from);

  useEffect(() => {
    if (view === "all") {
      setSelectedDateReleaseCount?.(releasesInRange.length);
      setTotalReleaseCount?.(releases.length);
    }
  }, [releases.length, releasesInRange.length, setSelectedDateReleaseCount, setTotalReleaseCount, view]);

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

  const ministersByKey = useMemo(
    () => Object.fromEntries(ministers.map((m) => [normalizeKey(m.name), m])),
    [ministers],
  );

  const headerRight = useMemo(() => {
    if (view === "minister" && ministerId != null) {
      const minister = ministers.find((m) => m.id === ministerId) ?? null;
      if (!minister) return null;
      const displayName = minister.name;
      const photoUrl = minister.photo_url ?? null;
      const designation = minister.designation ?? null;
      return (
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <div className="max-w-[260px] text-right">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {designation ? <p className="truncate text-xs text-muted-foreground">{designation}</p> : null}
          </div>
        </div>
      );
    }

    if (view === "department" && departmentId != null) {
      const dept = departments.find((d) => d.id === departmentId) ?? null;
      const minister = resolveMinisterFromName(dept?.minister_name, ministersByKey);
      const displayName = minister?.name ?? dept?.minister_name ?? null;
      if (!displayName) return null;
      const photoUrl = minister?.photo_url ?? null;
      const designation = minister?.designation ?? null;
      return (
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <div className="max-w-[260px] text-right">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            {designation ? <p className="truncate text-xs text-muted-foreground">{designation}</p> : null}
          </div>
        </div>
      );
    }

    return null;
  }, [view, ministerId, departmentId, ministers, departments, ministersByKey]);

  if (!latestDate && releases.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No press releases found.
      </p>
    );
  }

  if (isDateBrowse && !selectedDateRange.from) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Loading releases…
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
        {view === "department" || view === "minister" ? (
          <aside className="flex min-h-0 w-full shrink-0 flex-col lg:w-[220px] xl:w-[240px]">
            {view === "department" ? (
              <GovPressReleaseSideFilters
                title="Departments"
                options={filteredDepartmentSideOptions}
                selectedId={departmentId != null ? String(departmentId) : null}
                onSelect={(id) => setDepartmentId(Number.parseInt(id, 10))}
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
                search={ministerListSearch}
                onSearchChange={setMinisterListSearch}
                searchPlaceholder="Search ministers…"
                emptyMessage="No ministers match your search."
              />
            ) : null}
          </aside>
        ) : null}

        {isDateBrowse ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="mb-3 shrink-0">
              <h2 className="text-lg font-bold tracking-tight">
                {isSingleDayRange
                  ? format(parseReleaseDate(selectedDateRange.from), "EEEE, d MMMM yyyy")
                  : formatNewsDateRangeLabel(selectedDateRange)}
              </h2>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {releasesInRange.length === 0 ? (
                <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                  No press releases in this date range.
                </p>
              ) : isSingleDayRange ? (
                <div className="space-y-2">
                  {releasesInRange.map((release) => (
                    <ReleaseCard key={release.id} release={release} />
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {releasesByDateInRange.map(([date, dayReleases]) => (
                    <section key={date}>
                      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                        {format(parseReleaseDate(date), "EEEE, d MMMM yyyy")}
                      </h3>
                      <div className="space-y-2">
                        {dayReleases.map((release) => (
                          <ReleaseCard key={release.id} release={release} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <CrossDatePressReleaseBrowse
            title={browseTitle}
            subtitle={browseSubtitle}
            headerRight={headerRight ?? undefined}
            layout={view === "department" || view === "minister" ? "table" : "grouped"}
            releases={filteredReleases}
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
            renderRelease={(release) => <ReleaseCard key={release.id} release={release} />}
          />
        )}
      </div>
    </div>
  );
}
