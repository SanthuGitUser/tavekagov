import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { ImageLightbox } from "@/components/shared/ImageLightbox";
import {
  getLatestValidDate,
  VerticalDatePicker,
} from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import { useGovPressReleaseSearch } from "@/context/GovPressReleaseSearchContext";
import type { GovPressRelease, TnDept, TnMinister } from "@/types/database";

import { CrossDateReleaseBrowse } from "./CrossDateReleaseBrowse";
import { GovPressReleaseSideFilters } from "./GovPressReleaseSideFilters";
import { GovPressReleaseViewTabs } from "./GovPressReleaseViewTabs";
import {
  buildCategorySideOptions,
  buildDepartmentSideOptions,
  buildMinisterSideOptions,
  compareReleases,
  formatReleaseCount,
  getFlagFilterLabel,
  getReleaseName,
  groupReleasesByDate,
  matchesFlagFilter,
  matchesSearch,
  toLightboxImage,
  type GovPressReleaseFlagFilter,
  type GovPressReleaseView,
} from "./govPressReleaseUtils";

type GovPressReleaseTimelineProps = {
  releases: GovPressRelease[];
  departments: TnDept[];
  ministers: TnMinister[];
};

type DatedRelease = GovPressRelease & { release_date: string };

function parseReleaseDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function ReleaseReaderGrid({
  releases,
  onReleaseOpen,
}: {
  releases: GovPressRelease[];
  onReleaseOpen: (release: GovPressRelease) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {releases.map((release) => {
        const name = getReleaseName(release);
        return (
          <button
            key={release.id}
            type="button"
            onClick={() => onReleaseOpen(release)}
            className="group w-full overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition hover:border-primary/25 hover:shadow-md"
            title={name}
          >
            <div className="border-b border-border px-3 py-2.5 sm:px-4">
              <p className="line-clamp-3 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                {name}
              </p>
              {release.cm_visits ||
              release.portfolio ||
              release.review_meetings ||
              release.budget ||
              release.inspection ||
              release.tributes ||
              release.others ||
              release.postings ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {release.cm_visits ? (
                    <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                      CM Visit
                    </Badge>
                  ) : null}
                  {release.portfolio ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Portfolio
                    </Badge>
                  ) : null}
                  {release.review_meetings ? (
                    <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                      Review Meeting
                    </Badge>
                  ) : null}
                  {release.budget ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      Budget
                    </Badge>
                  ) : null}
                  {release.inspection ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      Inspection
                    </Badge>
                  ) : null}
                  {release.tributes ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Tribute
                    </Badge>
                  ) : null}
                  {release.others ? (
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                      Other
                    </Badge>
                  ) : null}
                  {release.postings ? (
                    <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                      Posting
                    </Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex min-h-[220px] items-center justify-center bg-muted/40 p-3 sm:min-h-[260px] sm:p-4">
              <img
                src={release.image_url}
                alt={name}
                loading="lazy"
                decoding="async"
                className="max-h-[min(55vh,480px)] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function GovPressReleaseTimeline({
  releases,
  departments,
  ministers,
}: GovPressReleaseTimelineProps) {
  const govPressReleaseSearch = useGovPressReleaseSearch();
  const search = govPressReleaseSearch?.search ?? "";

  const [view, setView] = useState<GovPressReleaseView>("all");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [ministerId, setMinisterId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<GovPressReleaseFlagFilter>("all");
  const [departmentListSearch, setDepartmentListSearch] = useState("");
  const [ministerListSearch, setMinisterListSearch] = useState("");

  const datedReleases = useMemo(
    () =>
      releases.filter(
        (release): release is DatedRelease => Boolean(release.release_date),
      ),
    [releases],
  );

  const allDates = useMemo(
    () => [...new Set(datedReleases.map((release) => release.release_date))],
    [datedReleases],
  );

  const departmentSideOptions = useMemo(
    () => buildDepartmentSideOptions(datedReleases, departments),
    [datedReleases, departments],
  );

  const ministerSideOptions = useMemo(
    () => buildMinisterSideOptions(datedReleases, ministers),
    [datedReleases, ministers],
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

  const releasesForDepartment = useMemo(() => {
    if (departmentId == null) return [];
    return datedReleases.filter((release) => release.department_id === departmentId);
  }, [datedReleases, departmentId]);

  const releasesForMinister = useMemo(() => {
    if (ministerId == null) return [];
    return datedReleases.filter((release) => release.minister_id === ministerId);
  }, [datedReleases, ministerId]);

  const departmentCategoryOptions = useMemo(
    () => buildCategorySideOptions(releasesForDepartment),
    [releasesForDepartment],
  );

  const ministerCategoryOptions = useMemo(
    () => buildCategorySideOptions(releasesForMinister),
    [releasesForMinister],
  );

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

  useEffect(() => {
    setCategoryFilter("all");
  }, [departmentId, ministerId, view]);

  useEffect(() => {
    if (view !== "department") return;
    if (departmentCategoryOptions.some((option) => option.id === categoryFilter)) return;
    setCategoryFilter(
      (departmentCategoryOptions[0]?.id as GovPressReleaseFlagFilter | undefined) ?? "all",
    );
  }, [view, departmentCategoryOptions, categoryFilter]);

  useEffect(() => {
    if (view !== "minister") return;
    if (ministerCategoryOptions.some((option) => option.id === categoryFilter)) return;
    setCategoryFilter(
      (ministerCategoryOptions[0]?.id as GovPressReleaseFlagFilter | undefined) ?? "all",
    );
  }, [view, ministerCategoryOptions, categoryFilter]);

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const isDateBrowse = view === "all" && !isSearching;
  const isCrossDateBrowse = !isDateBrowse;

  const filteredReleases = useMemo(() => {
    let rows = datedReleases.filter((release) => matchesSearch(release, query));

    if (view === "department" && departmentId != null) {
      rows = rows.filter((release) => release.department_id === departmentId);
      if (categoryFilter !== "all") {
        rows = rows.filter((release) => matchesFlagFilter(release, categoryFilter));
      }
    } else if (view === "minister" && ministerId != null) {
      rows = rows.filter((release) => release.minister_id === ministerId);
      if (categoryFilter !== "all") {
        rows = rows.filter((release) => matchesFlagFilter(release, categoryFilter));
      }
    }

    return rows.sort((a, b) => {
      const dateCompare = b.release_date.localeCompare(a.release_date);
      if (dateCompare !== 0) return dateCompare;
      return compareReleases(a, b);
    });
  }, [datedReleases, query, view, departmentId, ministerId, categoryFilter]);

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
    return datedReleases
      .filter((release) => release.release_date === selectedDate)
      .filter((release) => matchesSearch(release, query))
      .sort(compareReleases);
  }, [datedReleases, selectedDate, query]);

  const lightboxReleases = isCrossDateBrowse ? filteredReleases : releasesForDate;
  const lightboxPhotos = useMemo(
    () => lightboxReleases.map(toLightboxImage),
    [lightboxReleases],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (release: GovPressRelease) => {
    const index = lightboxReleases.findIndex((item) => item.id === release.id);
    if (index >= 0) setLightboxIndex(index);
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (lightboxIndex >= lightboxPhotos.length) {
      setLightboxIndex(null);
    }
  }, [lightboxIndex, lightboxPhotos.length]);

  useEffect(() => {
    setLightboxIndex(null);
  }, [selectedDate, query, view, departmentId, ministerId, categoryFilter]);

  const renderGrid = (dayReleases: GovPressRelease[]) => (
    <ReleaseReaderGrid releases={dayReleases} onReleaseOpen={openLightbox} />
  );

  const lightbox = (
    <ImageLightbox
      images={lightboxPhotos}
      index={lightboxIndex}
      onIndexChange={setLightboxIndex}
      enableZoom
      getImageName={(image) => image.title ?? image.file_name ?? `Release #${image.id}`}
    />
  );

  const browseTitle = useMemo(() => {
    if (isSearching) return "Search results";
    if (view === "department") {
      const dept = departmentSideOptions.find((o) => o.id === String(departmentId));
      if (categoryFilter !== "all") {
        return `${dept?.label ?? "Department"} · ${getFlagFilterLabel(categoryFilter)}`;
      }
      return dept?.label ?? "Department";
    }
    if (view === "minister") {
      const minister = ministerSideOptions.find((o) => o.id === String(ministerId));
      if (categoryFilter !== "all") {
        return `${minister?.label ?? "Minister"} · ${getFlagFilterLabel(categoryFilter)}`;
      }
      return minister?.label ?? "Minister";
    }
    return "All releases";
  }, [
    isSearching,
    view,
    categoryFilter,
    departmentId,
    ministerId,
    departmentSideOptions,
    ministerSideOptions,
  ]);

  const browseSubtitle = `${formatReleaseCount(filteredReleases.length)} total · ${filteredReleasesByDate.length} ${filteredReleasesByDate.length === 1 ? "date" : "dates"}`;

  if (!latestDate && datedReleases.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No releases found.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {lightbox}

      <div className="shrink-0">
        <GovPressReleaseViewTabs view={view} onViewChange={setView} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
        {view === "department" || view === "minister" ? (
          <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-[220px] xl:w-[240px]">
          {view === "department" ? (
            <>
              <GovPressReleaseSideFilters
                title="Departments"
                options={filteredDepartmentSideOptions}
                selectedId={departmentId != null ? String(departmentId) : null}
                onSelect={(id) => setDepartmentId(Number.parseInt(id, 10))}
                listClassName="max-h-[min(28vh,240px)]"
                search={departmentListSearch}
                onSearchChange={setDepartmentListSearch}
                searchPlaceholder="Search departments…"
                emptyMessage="No departments match your search."
              />
              <GovPressReleaseSideFilters
                title="Category"
                options={departmentCategoryOptions}
                selectedId={categoryFilter}
                onSelect={(id) => setCategoryFilter(id as GovPressReleaseFlagFilter)}
                listClassName="max-h-[min(40vh,360px)]"
              />
            </>
          ) : null}

          {view === "minister" ? (
            <>
              <GovPressReleaseSideFilters
                title="Ministers"
                options={filteredMinisterSideOptions}
                selectedId={ministerId != null ? String(ministerId) : null}
                onSelect={(id) => setMinisterId(Number.parseInt(id, 10))}
                listClassName="max-h-[min(28vh,240px)]"
                search={ministerListSearch}
                onSearchChange={setMinisterListSearch}
                searchPlaceholder="Search ministers…"
                emptyMessage="No ministers match your search."
              />
              <GovPressReleaseSideFilters
                title="Category"
                options={ministerCategoryOptions}
                selectedId={categoryFilter}
                onSelect={(id) => setCategoryFilter(id as GovPressReleaseFlagFilter)}
                listClassName="max-h-[min(40vh,360px)]"
              />
            </>
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
                  {formatReleaseCount(datedReleases.length)} total
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {releasesForDate.length === 0 ? (
                  <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                    No releases on this date.
                  </p>
                ) : (
                  <ReleaseReaderGrid releases={releasesForDate} onReleaseOpen={openLightbox} />
                )}
              </div>
            </div>
          </>
        ) : (
          <CrossDateReleaseBrowse
            title={browseTitle}
            subtitle={browseSubtitle}
            emptyMessage={
              isSearching
                ? "No releases match your search."
                : view === "department"
                  ? "No releases for this department and category."
                  : view === "minister"
                    ? "No releases for this minister and category."
                    : "No releases found."
            }
            groups={filteredReleasesByDate}
            renderGrid={renderGrid}
          />
        )}
      </div>
    </div>
  );
}
