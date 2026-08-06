import { format, parseISO } from "date-fns";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { PressRelease } from "@/types/models";

import { PressReleasesTable } from "./PressReleasesTable";
import { formatReleaseCount } from "./pressReleaseUtils";

type CrossDatePressReleaseBrowseProps = {
  title: string;
  subtitle: string;
  headerRight?: ReactNode;
  emptyMessage: string;
  groups: [string, PressRelease[]][];
  releases?: PressRelease[];
  renderRelease: (release: PressRelease) => ReactNode;
  layout?: "grouped" | "table";
};

const DATE_BATCH = 4;

function parseReleaseDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

export function CrossDatePressReleaseBrowse({
  title,
  subtitle,
  headerRight,
  emptyMessage,
  groups,
  releases = [],
  renderRelease,
  layout = "grouped",
}: CrossDatePressReleaseBrowseProps) {
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
      <div className="mb-3 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {layout === "table" ? (
          <PressReleasesTable releases={releases} emptyMessage={emptyMessage} />
        ) : groups.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-5">
            {visibleGroups.map(([date, dayReleases]) => (
              <section key={date}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {format(parseReleaseDate(date), "EEEE, d MMMM yyyy")}
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({formatReleaseCount(dayReleases.length)})
                  </span>
                </h3>
                <div className="space-y-2">
                  {dayReleases.map((release) => renderRelease(release))}
                </div>
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
