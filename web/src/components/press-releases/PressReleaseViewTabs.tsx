import { Building2, LayoutGrid, Users } from "lucide-react";

import {
  PRESS_RELEASE_VIEW_LABELS,
  type PressReleaseView,
} from "./pressReleaseUtils";
import { segmentedGroupClass, segmentedItemClass } from "@/lib/navStyles";
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
      className={cn(segmentedGroupClass, className)}
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
            className={segmentedItemClass(isActive)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {PRESS_RELEASE_VIEW_LABELS[mode]}
          </button>
        );
      })}
    </nav>
  );
}
