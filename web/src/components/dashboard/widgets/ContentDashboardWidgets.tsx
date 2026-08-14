import { format, parseISO } from "date-fns";
import { ExternalLink, FileText, Flame } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { groupNewsArticles } from "@/components/news/newsGroupUtils";
import { NewsStoryCard } from "@/components/news/NewsStoryCard";
import {
  DashboardEmptyState,
  DashboardWidgetCard,
} from "@/components/dashboard/DashboardWidgetCard";
import { PageLoading } from "@/components/shared/PageLoading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchNewsArticleCountForRange,
  getLatestMagazines,
  getPopularSchemes,
  getRecentSchemes,
  resolveDashboardNewsRange,
} from "@/lib/dashboardWidgetData";
import { loadNewsArticlesForDateRange } from "@/lib/tamilNaduNewsFeed";
import {
  getTVKManifestoCategoriesFrom,
  getTVKManifestoGroupsFrom,
  loadTVKManifestoFeed,
  type TVKManifestoFeedData,
} from "@/lib/tvkManifestoFeed";
import type { Magazine, TnGovtScheme } from "@/types/models";
import type { NewsStoryGroup } from "@/types/news";

type DateRange = { from: string; to: string } | null;

function formatIssueDate(value: string): string {
  return format(parseISO(value.includes("T") ? value : `${value}T00:00:00`), "MMMM yyyy");
}

function SchemePreviewCard({ scheme }: { scheme: TnGovtScheme }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {scheme.category}
          </Badge>
          {scheme.is_popular ? (
            <Badge className="gap-0.5 bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-300">
              <Flame className="h-2.5 w-2.5" />
              Popular
            </Badge>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
          <a href={scheme.detail_url} target="_blank" rel="noreferrer" aria-label={`Open ${scheme.title}`}>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-snug">{scheme.title}</h3>
      {scheme.benefit_summary ? (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{scheme.benefit_summary}</p>
      ) : null}
    </div>
  );
}

function MagazinePreviewTile({ magazine }: { magazine: Magazine }) {
  return (
    <a
      href={magazine.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-md border border-border bg-card transition hover:border-primary/25"
      title={magazine.name}
    >
      <div className="flex h-16 flex-col items-center justify-center gap-1 bg-muted px-2">
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <FileText className="h-4 w-4" />
        </div>
      </div>
      <div className="space-y-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug group-hover:text-primary">
          {magazine.name}
        </p>
        <p className="text-[10px] text-muted-foreground">{formatIssueDate(magazine.issue_date)}</p>
      </div>
    </a>
  );
}

export function GovtSchemesPopularWidget() {
  const schemes = getPopularSchemes(4);

  return (
    <DashboardWidgetCard
      title="Popular government schemes"
      description="Schemes marked popular in the manifest"
      viewAllTo="/govt-schemes"
    >
      {schemes.length === 0 ? (
        <DashboardEmptyState message="No popular schemes found." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {schemes.map((scheme) => (
            <SchemePreviewCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function GovtSchemesRecentWidget() {
  const schemes = getRecentSchemes(4);

  return (
    <DashboardWidgetCard
      title="Recently updated schemes"
      description="Latest scheme updates"
      viewAllTo="/govt-schemes"
    >
      {schemes.length === 0 ? (
        <DashboardEmptyState message="No schemes found." />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {schemes.map((scheme) => (
            <SchemePreviewCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function MagazineLatestWidget() {
  const magazines = getLatestMagazines(4);

  return (
    <DashboardWidgetCard
      title="Latest Tamil Arasu issues"
      description="Recent magazine tiles"
      viewAllTo="/magazine"
    >
      {magazines.length === 0 ? (
        <DashboardEmptyState message="No magazine issues found." />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {magazines.map((magazine) => (
            <MagazinePreviewTile key={magazine.id} magazine={magazine} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function NewsHeadlinesWidget({ dateRange }: { dateRange: DateRange }) {
  const [isLoading, setIsLoading] = useState(true);
  const [storyGroups, setStoryGroups] = useState<NewsStoryGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const resolved = resolveDashboardNewsRange(dateRange);

    loadNewsArticlesForDateRange(resolved.from, resolved.to)
      .then((articles) => {
        if (cancelled) return;
        setStoryGroups(groupNewsArticles(articles).slice(0, 4));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange?.from, dateRange?.to]);

  return (
    <DashboardWidgetCard
      title="News headlines"
      description="Grouped Tamil Nadu news stories"
      viewAllTo="/news"
      className="lg:col-span-2"
    >
      {isLoading ? (
        <PageLoading label="Loading news…" className="min-h-[12rem] border-0" />
      ) : storyGroups.length === 0 ? (
        <DashboardEmptyState message="No news articles in this date range." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {storyGroups.map((group) => (
            <NewsStoryCard key={group.primary.article_id} group={group} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function NewsFullPagePreviewWidget({ dateRange }: { dateRange: DateRange }) {
  const [isLoading, setIsLoading] = useState(true);
  const [storyGroups, setStoryGroups] = useState<NewsStoryGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const resolved = resolveDashboardNewsRange(dateRange);

    loadNewsArticlesForDateRange(resolved.from, resolved.to)
      .then((articles) => {
        if (cancelled) return;
        setStoryGroups(groupNewsArticles(articles).slice(0, 8));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange?.from, dateRange?.to]);

  return (
    <DashboardWidgetCard
      title="News full-page preview"
      description="Dense list preview of grouped headlines"
      viewAllTo="/news"
      className="lg:col-span-2"
    >
      {isLoading ? (
        <PageLoading label="Loading news preview…" className="min-h-[10rem] border-0" />
      ) : storyGroups.length === 0 ? (
        <DashboardEmptyState message="No news articles in this date range." />
      ) : (
        <div className="space-y-2">
          {storyGroups.map((group) => (
            <div
              key={group.primary.article_id}
              className="rounded-md border border-border/70 bg-background/40 px-3 py-2.5"
            >
              <p className="text-sm font-medium leading-snug">{group.primary.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {group.sources.length} source{group.sources.length === 1 ? "" : "s"} · {group.primary.source_name}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function TvkManifestoSummaryWidget() {
  const [feedData, setFeedData] = useState<TVKManifestoFeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadTVKManifestoFeed()
      .then((data) => {
        if (!cancelled) setFeedData(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categoryCounts = useMemo(() => {
    if (!feedData) return [];
    return getTVKManifestoCategoriesFrom(feedData).map((category) => ({
      category,
      sections: getTVKManifestoGroupsFrom(feedData, category).reduce(
        (total, group) => total + group.children.length,
        0,
      ),
    }));
  }, [feedData]);

  return (
    <DashboardWidgetCard
      title="TVK manifesto summary"
      description="Lazy-loaded manifesto counts by category"
      viewAllTo="/tvk-manifesto"
    >
      {isLoading ? (
        <PageLoading label="Loading manifesto…" className="min-h-[8rem] border-0" />
      ) : !feedData ? (
        <DashboardEmptyState message="Manifesto data is unavailable." />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border/70 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Groups</p>
              <p className="text-2xl font-bold tabular-nums">{feedData.groupCount}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Sections</p>
              <p className="text-2xl font-bold tabular-nums">{feedData.sectionCount}</p>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Source rows</p>
              <p className="text-2xl font-bold tabular-nums">{feedData.totalRows}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryCounts.map((entry) => (
              <Badge key={entry.category} variant="outline">
                {entry.category}: {entry.sections}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function TvkManifestoPreviewWidget() {
  const [feedData, setFeedData] = useState<TVKManifestoFeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadTVKManifestoFeed()
      .then((data) => {
        if (!cancelled) setFeedData(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const previewGroups = useMemo(() => {
    if (!feedData) return [];
    return feedData.groups.slice(0, 3);
  }, [feedData]);

  return (
    <DashboardWidgetCard
      title="TVK manifesto preview"
      description="First manifesto groups and section titles"
      viewAllTo="/tvk-manifesto"
      className="lg:col-span-2"
    >
      {isLoading ? (
        <PageLoading label="Loading manifesto preview…" className="min-h-[10rem] border-0" />
      ) : previewGroups.length === 0 ? (
        <DashboardEmptyState message="No manifesto groups found." />
      ) : (
        <div className="space-y-3">
          {previewGroups.map((group) => (
            <div key={group.id} className="rounded-md border border-border/70 bg-background/40 p-3">
              <p className="text-sm font-semibold">{group.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{group.category}</p>
              <ul className="mt-2 space-y-1 text-xs text-foreground/90">
                {group.children.slice(0, 3).map((child) => (
                  <li key={child.id}>• {child.title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function useDashboardAsyncCounts(dateRange: DateRange) {
  const [newsCount, setNewsCount] = useState<number | null>(null);
  const [tvkSectionCount, setTvkSectionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchNewsArticleCountForRange(dateRange),
      loadTVKManifestoFeed().then((feed) => feed.sectionCount),
    ])
      .then(([news, tvkSections]) => {
        if (cancelled) return;
        setNewsCount(news);
        setTvkSectionCount(tvkSections);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateRange?.from, dateRange?.to]);

  return { newsCount, tvkSectionCount, loading };
}
