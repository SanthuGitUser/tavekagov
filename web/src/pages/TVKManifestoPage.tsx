import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { useTVKManifestoSearch } from "@/context/TVKManifestoSearchContext";
import { filterTVKManifestoGroups } from "@/lib/tvkManifestoFilterUtils";
import { cn } from "@/lib/utils";
import {
  getTVKManifestoCategories,
  getTVKManifestoGroups,
  tvkManifestoFeed,
} from "@/lib/tvkManifestoFeed";

export function TVKManifestoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const manifestoSearch = useTVKManifestoSearch();
  const search = manifestoSearch?.search ?? "";

  const categories = useMemo(() => getTVKManifestoCategories(), []);
  const rawSelectedCategory = searchParams.get("category") ?? "all";
  const selectedCategory =
    rawSelectedCategory === "all" || categories.includes(rawSelectedCategory)
      ? rawSelectedCategory
      : "all";
  const groups = useMemo(() => {
    const categoryGroups = getTVKManifestoGroups(selectedCategory === "all" ? null : selectedCategory);
    return filterTVKManifestoGroups(categoryGroups, search);
  }, [selectedCategory, search]);
  const selectedChildId = searchParams.get("section");
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());

  const { activeGroup, activeChild } = useMemo(() => {
    const firstGroup = groups[0] ?? null;
    const firstChild = firstGroup?.children[0] ?? null;

    if (!selectedChildId) {
      return { activeGroup: firstGroup, activeChild: firstChild };
    }

    for (const group of groups) {
      const child = group.children.find((item) => item.id === selectedChildId);
      if (child) return { activeGroup: group, activeChild: child };
    }

    return { activeGroup: firstGroup, activeChild: firstChild };
  }, [groups, selectedChildId]);

  useEffect(() => {
    if (!activeGroup) return;
    setExpandedGroupIds((current) => {
      if (current.has(activeGroup.id)) return current;
      const next = new Set(current);
      next.add(activeGroup.id);
      return next;
    });
  }, [activeGroup?.id]);

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  if (tvkManifestoFeed.sectionCount === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No manifesto content found. Ensure `TN-TVK-Manifesto/manifests/tvk_manifesto.json` is present.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No manifesto sections match your search."
              : "No manifesto sections match your current filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
            <aside className="flex min-h-0 shrink-0 flex-col lg:w-[26rem]">
              <Card className="min-h-0 flex-1 border-border bg-muted/40">
                <CardContent className="max-h-64 min-h-0 overflow-y-auto p-2.5 lg:max-h-full">
                  <div className="space-y-2.5">
                    {groups.map((group) => {
                      const isActiveGroup = group.id === activeGroup?.id;
                      const isExpanded = expandedGroupIds.has(group.id);

                      return (
                        <div
                          key={group.id}
                          className={cn(
                            "overflow-hidden rounded-lg border shadow-sm transition-colors",
                            isActiveGroup
                              ? "border-primary bg-card ring-1 ring-primary/40"
                              : "border-border bg-card hover:border-foreground/20",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className={cn(
                              "flex w-full items-start gap-2.5 border-b px-3 py-3 text-left transition-colors",
                              isExpanded ? "border-border" : "border-transparent",
                              isActiveGroup
                                ? "bg-primary/15 text-foreground"
                                : "bg-muted/70 text-foreground hover:bg-muted",
                            )}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronDown
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  isActiveGroup ? "text-primary" : "text-foreground",
                                )}
                              />
                            ) : (
                              <ChevronRight
                                className={cn(
                                  "mt-0.5 h-4 w-4 shrink-0",
                                  isActiveGroup ? "text-primary" : "text-foreground",
                                )}
                              />
                            )}
                            <span className="min-w-0 flex-1 leading-snug">
                              <span className="text-sm font-semibold">{group.title}</span>
                              <span className="ml-1.5 text-xs font-semibold text-foreground/70">
                                ({group.children.length})
                              </span>
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="space-y-1 bg-muted/50 px-2 py-2">
                              {group.children.map((child) => {
                                const isActiveChild = child.id === activeChild?.id;
                                return (
                                  <button
                                    key={child.id}
                                    type="button"
                                    onClick={() =>
                                      setSearchParams(
                                        selectedCategory === "all"
                                          ? { category: "all", section: child.id }
                                          : { category: selectedCategory, section: child.id },
                                        { replace: true },
                                      )
                                    }
                                    className={cn(
                                      "w-full rounded-md border px-2.5 py-2.5 text-left text-xs leading-snug transition-colors sm:text-[13px]",
                                      isActiveChild
                                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-sm"
                                        : "border-transparent bg-card text-foreground/90 hover:border-border hover:bg-background",
                                    )}
                                  >
                                    {child.title}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </aside>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1">
              {!activeGroup || !activeChild ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    Select a section from the left.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                        {activeGroup.title}
                      </p>
                      <h3 className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                        {activeChild.title}
                      </h3>
                    </div>

                    <ul className="space-y-3">
                      {activeChild.points.length === 0 ? (
                        <li className="rounded-md border border-border/60 bg-muted/40 px-4 py-4 text-center text-sm text-muted-foreground sm:text-base">
                          This section has no manifesto points. It is a divider page in the source PDF.
                        </li>
                      ) : (
                        activeChild.points.map((point, index) => (
                          <li
                            key={`${point.number ?? ""}||${point.title}`}
                            className="rounded-md border border-border/60 bg-background/40 px-4 py-3"
                          >
                            <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
                              {index + 1}. {point.title}
                            </p>
                            {point.description ? (
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                                {point.description}
                              </p>
                            ) : null}
                          </li>
                        ))
                      )}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

