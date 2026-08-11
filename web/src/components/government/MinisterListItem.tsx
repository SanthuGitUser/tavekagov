import { Badge } from "@/components/ui/badge";
import type { MinisterDepartmentGroup } from "@/lib/governmentGroupUtils";
import { cn } from "@/lib/utils";

type MinisterListItemProps = {
  group: MinisterDepartmentGroup;
  selected: boolean;
  onSelect: (ministerId: number) => void;
};

function stripHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

function formatDepartmentCount(count: number): string {
  return `${count} department${count === 1 ? "" : "s"}`;
}

export function MinisterListItem({ group, selected, onSelect }: MinisterListItemProps) {
  const { minister, departments } = group;

  return (
    <button
      type="button"
      onClick={() => onSelect(minister.id)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary/40 bg-accent/30 ring-1 ring-primary/20"
          : "border-border/70 bg-card hover:border-primary/20 hover:bg-accent/15",
      )}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
        {minister.photo_url ? (
          <img
            src={minister.photo_url}
            alt={minister.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {minister.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{minister.name}</span>
          {minister.is_chief_minister ? (
            <Badge className="px-1.5 py-0 text-[10px]">CM</Badge>
          ) : null}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {stripHtml(minister.designation)}
        </p>
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
          {formatDepartmentCount(departments.length)}
        </Badge>
      </div>
    </button>
  );
}
