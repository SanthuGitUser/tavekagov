import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMinisterSearch } from "@/context/MinisterSearchContext";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { cn } from "@/lib/utils";

function stripHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

export function MinistersPage() {
  const ministerSearch = useMinisterSearch();
  const search = ministerSearch?.search ?? "";

  const ministers = useMemo(() => tamilNaduMinistersFeed.ministers, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ministers;
    return ministers.filter((minister) => {
      const haystack = [minister.name, minister.designation, minister.portfolio]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [ministers, search]);

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No ministers match your search.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((minister) => (
            <Card
              key={minister.id}
              className={cn(
                "group transition-colors",
                "cursor-pointer hover:border-primary/25 hover:bg-accent/20",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
              )}
            >
              <CardContent className="flex gap-4 p-5">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                  {minister.photo_url ? (
                    <img
                      src={minister.photo_url}
                      alt={minister.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                      {minister.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{minister.name}</h3>
                      {minister.is_chief_minister ? <Badge>Chief Minister</Badge> : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                      asChild
                    >
                      <a
                        href={tamilNaduMinistersFeed.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open official ministers list page"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stripHtml(minister.designation)}
                  </p>
                  {minister.portfolio ? (
                    <p className="text-sm leading-relaxed">{stripHtml(minister.portfolio)}</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
