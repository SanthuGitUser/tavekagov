import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  formatPrNumber,
  getLatestValidDate,
  VerticalDatePicker,
} from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import { usePressReleaseSearch } from "@/context/PressReleaseSearchContext";
import type { PressRelease } from "@/types/database";
import type { TnMinister } from "@/types/database";

type PressReleaseTimelineProps = {
  releases: PressRelease[];
  ministersById?: Record<number, TnMinister>;
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
}: {
  release: PressRelease;
  minister?: TnMinister;
}) {
  const prNumber = formatPrNumber(release.dipr_pr_no);

  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-accent/60">
      <div className="flex items-start gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-medium leading-snug text-foreground">
          {release.name}
        </h3>
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

function matchesSearch(release: PressRelease, query: string): boolean {
  if (!query) return true;
  const haystack = [
    release.name,
    release.topic,
    release.department_name,
    release.release_type,
    release.dipr_pr_no,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function PressReleaseTimeline({
  releases,
  ministersById = {},
}: PressReleaseTimelineProps) {
  const pressReleaseSearch = usePressReleaseSearch();
  const search = pressReleaseSearch?.search ?? "";

  const availableDates = useMemo(
    () => [...new Set(releases.map((release) => release.pr_date))],
    [releases],
  );

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const searchMatches = useMemo(() => {
    if (!isSearching) return [];
    return releases
      .filter((release) => matchesSearch(release, query))
      .sort((a, b) => {
        const dateCompare = b.pr_date.localeCompare(a.pr_date);
        if (dateCompare !== 0) return dateCompare;
        return compareByPrNumber(a, b);
      });
  }, [releases, query, isSearching]);

  const searchMatchesByDate = useMemo(() => {
    const grouped = new Map<string, PressRelease[]>();
    for (const release of searchMatches) {
      const existing = grouped.get(release.pr_date);
      if (existing) {
        existing.push(release);
      } else {
        grouped.set(release.pr_date, [release]);
      }
    }
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [searchMatches]);

  const datesForPicker = useMemo(() => {
    if (!isSearching) return availableDates;
    return [...new Set(searchMatches.map((release) => release.pr_date))];
  }, [availableDates, isSearching, searchMatches]);

  const latestDate = useMemo(
    () => getLatestValidDate(datesForPicker),
    [datesForPicker],
  );

  const [selectedDate, setSelectedDate] = useState<string>(latestDate ?? "");

  useEffect(() => {
    if (latestDate) setSelectedDate(latestDate);
  }, [latestDate]);

  useEffect(() => {
    if (selectedDate && !datesForPicker.includes(selectedDate) && latestDate) {
      setSelectedDate(latestDate);
    }
  }, [datesForPicker, latestDate, selectedDate]);

  const releasesForDate = useMemo(() => {
    return releases
      .filter((release) => release.pr_date === selectedDate)
      .filter((release) => matchesSearch(release, query))
      .sort(compareByPrNumber);
  }, [releases, selectedDate, query]);

  if (!latestDate) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        {isSearching ? "No press releases match your search." : "No press releases found."}
      </p>
    );
  }

  if (isSearching) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Search results</h2>
            <p className="text-xs text-muted-foreground">
              {searchMatches.length} release
              {searchMatches.length === 1 ? "" : "s"} across {searchMatchesByDate.length}{" "}
              {searchMatchesByDate.length === 1 ? "date" : "dates"}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {searchMatchesByDate.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No press releases match your search.
            </p>
          ) : (
            <div className="space-y-5">
              {searchMatchesByDate.map(([date, dayReleases]) => (
                <section key={date}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {format(parseReleaseDate(date), "EEEE, d MMMM yyyy")}
                  </h3>
                  <div className="space-y-2">
                    {dayReleases.map((release) => (
                      <ReleaseCard
                        key={release.id}
                        release={release}
                        minister={
                          release.minister_id ? ministersById[release.minister_id] : undefined
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
      <aside className="flex shrink-0 flex-col items-center">
        <p className="mb-1.5 w-[128px] text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Select date
        </p>
        <VerticalDatePicker
          availableDates={datesForPicker}
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 shrink-0">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              {format(parseReleaseDate(selectedDate), "EEEE, d MMMM yyyy")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {releasesForDate.length} release
              {releasesForDate.length === 1 ? "" : "s"}
            </p>
          </div>
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
                  minister={
                    release.minister_id ? ministersById[release.minister_id] : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
