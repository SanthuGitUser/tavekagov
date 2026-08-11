import { ExternalLink, Flame } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useGovtSchemesSearch } from "@/context/GovtSchemesSearchContext";
import { filterGovtSchemes } from "@/lib/govtSchemeFilterUtils";
import {
  getGovtSchemes,
  tamilNaduGovtSchemesFeed,
} from "@/lib/tamilNaduGovtSchemesFeed";
import { cn } from "@/lib/utils";
import type { TnGovtScheme } from "@/types/models";

function SchemeCard({ scheme }: { scheme: TnGovtScheme }) {
  return (
    <Card
      className={cn(
        "group transition-colors",
        "hover:border-primary/25 hover:bg-accent/20",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
      )}
    >
      <CardContent className="space-y-1.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {scheme.category}
            </Badge>
            {scheme.is_popular ? (
              <Badge className="gap-0.5 bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
                <Flame className="h-2.5 w-2.5" />
                Popular
              </Badge>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
            asChild
          >
            <a
              href={scheme.detail_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${scheme.title} on Schemes in India`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        <h3 className="text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
          {scheme.title}
        </h3>

        {scheme.benefit_summary ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">{scheme.benefit_summary}</p>
        ) : null}

        {scheme.updated_label ? (
          <p className="text-right text-[10px] text-muted-foreground">
            Updated {scheme.updated_label}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function GovtSchemesPage() {
  const schemeSearch = useGovtSchemesSearch();
  const search = schemeSearch?.search ?? "";
  const sectionFilter = schemeSearch?.sectionFilter ?? "state";
  const categoryFilter = schemeSearch?.categoryFilter ?? "all";

  const schemes = useMemo(() => getGovtSchemes(), []);

  const filtered = useMemo(
    () =>
      filterGovtSchemes(schemes, {
        search,
        sectionFilter,
        categoryFilter,
      }),
    [schemes, search, sectionFilter, categoryFilter],
  );

  if (schemes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No schemes found. Run the govt schemes sync to load data from{" "}
          <a
            href={tamilNaduGovtSchemesFeed.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Schemes in India
          </a>
          .
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No schemes match your filters.
          </CardContent>
        </Card>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((scheme) => (
              <SchemeCard key={`${scheme.section}:${scheme.id}`} scheme={scheme} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
