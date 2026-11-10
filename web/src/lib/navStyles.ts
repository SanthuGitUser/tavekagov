import { cn } from "@/lib/utils";

/*
 * Three navigation levels, three visual styles, so they never look alike:
 *   1. Main menu (top bar)      - text tabs with a thick underline
 *   2. Section tabs (strip)     - small plain links, active in primary colour
 *   3. View / variant switches  - boxed segmented control (below)
 */

export const segmentedGroupClass =
  "inline-flex max-w-full shrink-0 items-center gap-0.5 overflow-x-auto rounded-md border border-border bg-muted/50 p-0.5";

export function segmentedItemClass(active: boolean): string {
  return cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-card text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground",
  );
}
