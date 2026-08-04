import { cn } from "@/lib/utils";

import type { GovPressReleaseFlagFilter } from "./govPressReleaseUtils";
import type { SideFilterOption } from "./GovPressReleaseSideFilters";

type GovPressReleaseCategoryFilterButtonProps = {
  options: SideFilterOption[];
  value: GovPressReleaseFlagFilter;
  onChange: (value: GovPressReleaseFlagFilter) => void;
  className?: string;
};

export function GovPressReleaseCategoryFilterButton({
  options,
  value,
  onChange,
  className,
}: GovPressReleaseCategoryFilterButtonProps) {
  if (options.length === 0) return null;

  return (
    <div
      className={cn("flex shrink-0 flex-wrap items-center gap-1.5", className)}
      role="tablist"
      aria-label="Category filter"
    >
      {options.map((option) => {
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id as GovPressReleaseFlagFilter)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <span>{option.label}</span>
            <span className={cn("tabular-nums", isActive ? "opacity-90" : "opacity-70")}>
              ({option.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
