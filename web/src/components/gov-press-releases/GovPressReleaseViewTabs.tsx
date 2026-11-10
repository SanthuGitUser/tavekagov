import { Building2, LayoutGrid, Users } from "lucide-react";

import {
  GOV_PRESS_RELEASE_VIEW_LABELS,
  type GovPressReleaseView,
} from "./govPressReleaseUtils";
import { segmentedGroupClass, segmentedItemClass } from "@/lib/navStyles";
import { cn } from "@/lib/utils";

type GovPressReleaseViewTabsProps = {
  viewMode: GovPressReleaseView;
  onViewModeChange: (view: GovPressReleaseView) => void;
  className?: string;
};

const VIEW_OPTIONS: {
  mode: GovPressReleaseView;
  icon: typeof LayoutGrid;
}[] = [
  { mode: "all", icon: LayoutGrid },
  { mode: "department", icon: Building2 },
  { mode: "minister", icon: Users },
];

export function GovPressReleaseViewTabs({
  viewMode,
  onViewModeChange,
  className,
}: GovPressReleaseViewTabsProps) {
  return (
    <nav
      className={cn(segmentedGroupClass, className)}
      role="tablist"
      aria-label="PR images browse view"
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
            {GOV_PRESS_RELEASE_VIEW_LABELS[mode]}
          </button>
        );
      })}
    </nav>
  );
}
