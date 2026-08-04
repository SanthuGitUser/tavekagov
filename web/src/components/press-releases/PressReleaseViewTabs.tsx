import { Building2, LayoutGrid, Users } from "lucide-react";

import {
  PRESS_RELEASE_VIEW_LABELS,
  type PressReleaseView,
} from "./pressReleaseUtils";
import { cn } from "@/lib/utils";

type PressReleaseViewTabsProps = {
  viewMode: PressReleaseView;
  onViewModeChange: (view: PressReleaseView) => void;
  className?: string;
};

const VIEW_OPTIONS: {
  mode: PressReleaseView;
  icon: typeof LayoutGrid;
}[] = [
  { mode: "all", icon: LayoutGrid },
  { mode: "department", icon: Building2 },
  { mode: "minister", icon: Users },
];

export function PressReleaseViewTabs({
  viewMode,
  onViewModeChange,
  className,
}: PressReleaseViewTabsProps) {
  return (
    <nav
      className={cn("flex gap-1 overflow-x-auto", className)}
      role="tablist"
      aria-label="Press release browse view"
    >
      {VIEW_OPTIONS.map(({ mode, icon: Icon }) => {
        const isActive = viewMode === mode;
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onViewModeChange(mode)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 px-2.5 pb-1.5 pt-0.5 text-xs font-medium transition-colors",
              isActive
                ? "text-primary after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {PRESS_RELEASE_VIEW_LABELS[mode]}
          </button>
        );
      })}
    </nav>
  );
}
