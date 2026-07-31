import { cn } from "@/lib/utils";

import {
  GOV_PRESS_RELEASE_VIEW_LABELS,
  type GovPressReleaseView,
} from "./govPressReleaseUtils";

type GovPressReleaseViewTabsProps = {
  view: GovPressReleaseView;
  onViewChange: (view: GovPressReleaseView) => void;
  className?: string;
};

const VIEW_OPTIONS: GovPressReleaseView[] = ["all", "department", "minister"];

export function GovPressReleaseViewTabs({
  view,
  onViewChange,
  className,
}: GovPressReleaseViewTabsProps) {
  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-lg border border-border bg-muted/15",
        className,
      )}
      role="tablist"
      aria-label="Press release browse view"
    >
      {VIEW_OPTIONS.map((option, index) => {
        const isSelected = view === option;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onViewChange(option)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              index > 0 && "border-l border-border/60",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {GOV_PRESS_RELEASE_VIEW_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}
