import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MinisterDepartmentGroup } from "@/lib/governmentGroupUtils";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { cn } from "@/lib/utils";

type MinisterDetailPanelProps = {
  group: MinisterDepartmentGroup;
};

function stripHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

function normalizePortfolios(portfolios: string[]): string[] {
  return portfolios
    .map((item) => stripHtml(item).trim())
    .map((item) => item.replace(/\s+,/g, ","))
    .map((item) => item.replace(/,+$/, ""))
    .filter(Boolean);
}

export function MinisterDetailPanel({ group }: MinisterDetailPanelProps) {
  const { minister } = group;

  const portfolios = useMemo(() => normalizePortfolios(minister.portfolios), [minister.portfolios]);
  const designation = stripHtml(minister.designation);

  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/60 transition-all duration-200 hover:border-primary/25 hover:shadow-md",
        minister.is_chief_minister && "ring-1 ring-primary/15",
      )}
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-border/60 sm:h-16 sm:w-16",
              minister.is_chief_minister && "ring-primary/30",
            )}
          >
            {minister.photo_url ? (
              <img
                src={minister.photo_url}
                alt={minister.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                {minister.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="text-base font-semibold leading-snug tracking-tight">
                    {minister.name}
                  </h2>
                  {minister.is_chief_minister ? (
                    <Badge className="px-1.5 py-0 text-[10px]">Chief Minister</Badge>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {designation}
                </p>
              </div>

              <a
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-70 transition-colors hover:bg-accent hover:text-primary group-hover:opacity-100"
                href={tamilNaduMinistersFeed.sourceUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open official page for ${minister.name}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>

        {portfolios.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Portfolios
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {portfolios.join(", ")}.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
