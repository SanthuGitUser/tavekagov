import { useMemo } from "react";
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
  }, [selectedCategory, search]);  const selectedChildId = searchParams.get("section");

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
              <Card className="min-h-0 flex-1">
                <CardContent className="max-h-64 min-h-0 overflow-y-auto p-3 lg:max-h-full">
                  <div className="space-y-2">
                    {groups.map((group) => {
                      const isActiveGroup = group.id === activeGroup?.id;
                      return (
                        <details key={group.id} open={isActiveGroup} className="group">
                          <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-sm font-semibold text-foreground hover:bg-accent/20 [&::-webkit-details-marker]:hidden">
                            {group.title}
                            <span className="ml-2 text-xs font-medium text-muted-foreground">
                              ({group.children.length})
                            </span>
                          </summary>
                          <div className="mt-1 space-y-1 pl-2">
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
                                    "w-full rounded-md px-2 py-2 text-left text-xs font-medium transition-colors",
                                    isActiveChild
                                      ? "bg-accent/30 text-foreground ring-1 ring-border/60"
                                      : "text-muted-foreground hover:bg-accent/15 hover:text-foreground",
                                  )}
                                >
                                  {child.title}
                                </button>
                              );
                            })}
                          </div>
                        </details>
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
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {activeGroup.title}
                      </p>
                      <h3 className="text-sm font-semibold leading-snug text-foreground">
                        {activeChild.title}
                      </h3>
                    </div>

                    <ul className="space-y-2">
                      {activeChild.points.map((point, index) => (
                        <li
                          key={`${point.number ?? ""}||${point.title}`}
                          className="rounded-md border border-border/60 bg-background/40 px-3 py-2"
                        >
                          <p className="text-xs font-semibold leading-snug text-foreground">
                            {index + 1}. {point.title}
                          </p>
                          {point.description ? (
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              {point.description}
                            </p>
                          ) : null}
                        </li>
                      ))}
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

