import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { TnDept, TnMinister } from "@/types/models";

type DepartmentTileProps = {
  department: TnDept;
  showMinister?: boolean;
  minister?: TnMinister | null;
};

export function DepartmentTile({
  department,
  showMinister = false,
  minister = null,
}: DepartmentTileProps) {
  const ministerName = minister?.name ?? department.minister_name ?? "—";
  const ministerDesignation = minister?.designation ?? "";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/80 p-3 transition-colors hover:border-primary/20 hover:bg-accent/15">
      {showMinister ? (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {minister?.photo_url ? (
            <img
              src={minister.photo_url}
              alt={ministerName}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
              {ministerName.charAt(0)}
            </div>
          )}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-snug">{department.name}</h4>
          {department.profile_url ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
              asChild
            >
              <a
                href={department.profile_url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${department.name} official page`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
        {showMinister ? (
          <div className="space-y-0.5">
            <p className="text-sm text-muted-foreground">{ministerName}</p>
            {ministerDesignation ? (
              <p className="text-xs text-muted-foreground">{ministerDesignation}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
