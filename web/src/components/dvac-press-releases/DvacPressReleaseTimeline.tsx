import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo } from "react";

import { useDvacPressReleaseSearch } from "@/context/DvacPressReleaseSearchContext";
import type { DvacPressRelease } from "@/types/models";

type DvacPressReleaseTimelineProps = {
  releases: DvacPressRelease[];
};

function normalizeQuery(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function parseIsoDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function ReleaseCard({ release }: { release: DvacPressRelease }) {
  return (
    <article className="rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-accent/60">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium leading-snug text-foreground">{release.title}</h3>
          {release.file_name ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{release.file_name}</p>
          ) : null}
        </div>
        <a
          href={release.pdf_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:underline"
        >
          Open PDF <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </article>
  );
}

export function DvacPressReleaseTimeline({ releases }: DvacPressReleaseTimelineProps) {
  const dvacSearch = useDvacPressReleaseSearch();
  const search = dvacSearch?.search ?? "";
  const selectedMonth = dvacSearch?.selectedMonth ?? "";

  const availableMonths = useMemo(() => {
    return [...new Set(releases.map((release) => monthKey(release.release_date)))]
      .filter(Boolean)
      .sort()
      .reverse();
  }, [releases]);

  const latestMonth = availableMonths[0] ?? "";

  useEffect(() => {
    dvacSearch?.setAvailableMonths(availableMonths);
  }, [availableMonths, dvacSearch]);

  useEffect(() => {
    if (!dvacSearch) return;
    if (!dvacSearch.selectedMonth && latestMonth) {
      dvacSearch.setSelectedMonth(latestMonth);
    }
  }, [dvacSearch, latestMonth]);

  const query = normalizeQuery(search);

  const filtered = useMemo(() => {
    const month = selectedMonth || latestMonth;

    const inMonth = releases.filter((release) =>
      month ? monthKey(release.release_date) === month : true,
    );

    const inSearch = inMonth.filter((release) =>
      query ? normalizeQuery(release.title).includes(query) : true,
    );

    return inSearch
      .sort((left, right) => {
        const dateDiff = right.release_date.localeCompare(left.release_date);
        if (dateDiff !== 0) return dateDiff;
        return left.title.localeCompare(right.title);
      });
  }, [releases, selectedMonth, latestMonth, query]);

  useEffect(() => {
    if (!dvacSearch) return;
    const month = selectedMonth || latestMonth;
    const monthTotal = releases.filter((release) =>
      month ? monthKey(release.release_date) === month : true,
    ).length;
    dvacSearch.setTotalCount(monthTotal);
    dvacSearch.setFilteredCount(filtered.length);
  }, [dvacSearch, filtered.length, latestMonth, releases, selectedMonth]);

  const filteredByDate = useMemo(() => {
    const bucket = new Map<string, DvacPressRelease[]>();
    for (const release of filtered) {
      bucket.set(release.release_date, [...(bucket.get(release.release_date) ?? []), release]);
    }
    return [...bucket.entries()].sort(([left], [right]) => right.localeCompare(left));
  }, [filtered]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            No DVAC press releases in this month.
          </p>
        ) : (
          <div className="space-y-5">
            {filteredByDate.map(([isoDate, dayReleases]) => (
              <section key={isoDate}>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {format(parseIsoDate(isoDate), "EEEE, d MMMM yyyy")}
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
  );
}

