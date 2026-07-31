import { format, parseISO } from "date-fns";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { GovPressRelease } from "@/types/models";

import { formatReleaseCount } from "./govPressReleaseUtils";

type CrossDateReleaseBrowseProps = {
  title: string;
  subtitle: string;
  emptyMessage: string;
  groups: [string, GovPressRelease[]][];
  renderGrid: (releases: GovPressRelease[]) => ReactNode;
};

const DATE_BATCH = 4;

function parseReleaseDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

export function CrossDateReleaseBrowse({
  title,
  subtitle,
  emptyMessage,
  groups,
  renderGrid,
}: CrossDateReleaseBrowseProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [visibleDateGroups, setVisibleDateGroups] = useState(DATE_BATCH);

  useEffect(() => {
    setVisibleDateGroups(DATE_BATCH);
  }, [groups.length, title]);

  useEffect(() => {
    const root = scrollRef.current;
    const target = loadMoreRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisibleDateGroups((current) => Math.min(current + DATE_BATCH, groups.length));
      },
      { root, rootMargin: "600px 0px 600px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [groups.length]);

  const visibleGroups = groups.slice(0, visibleDateGroups);
  const hasMore = visibleDateGroups < groups.length;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-3 shrink-0 space-y-1">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-6">
            {visibleGroups.map(([date, dayReleases]) => (
              <section key={date}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {format(parseReleaseDate(date), "EEEE, d MMMM yyyy")}
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({formatReleaseCount(dayReleases.length)})
                  </span>
                </h3>
                {renderGrid(dayReleases)}
              </section>
            ))}
            {hasMore ? (
              <div
                ref={loadMoreRef}
                className="rounded-lg border border-border bg-muted/15 p-3 text-center text-xs text-muted-foreground"
              >
                Loading more…
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
