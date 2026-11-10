import { CalendarDays, Building2 } from "lucide-react";

import type { GovernmentOrdersViewMode } from "@/context/GovernmentOrdersViewContext";
import { segmentedGroupClass, segmentedItemClass } from "@/lib/navStyles";
import { cn } from "@/lib/utils";

type GovernmentOrdersViewTabsProps = {
  viewMode: GovernmentOrdersViewMode;
  onViewModeChange: (mode: GovernmentOrdersViewMode) => void;
  className?: string;
};

const VIEW_OPTIONS: {
  mode: GovernmentOrdersViewMode;
  label: string;
  icon: typeof CalendarDays;
}[] = [
  { mode: "calendar", label: "Calendar", icon: CalendarDays },
  { mode: "department", label: "By department", icon: Building2 },
];

export function GovernmentOrdersViewTabs({
  viewMode,
  onViewModeChange,
  className,
}: GovernmentOrdersViewTabsProps) {
  return (
    <nav
      className={cn(segmentedGroupClass, className)}
      role="tablist"
      aria-label="Government orders view"
    >
      {VIEW_OPTIONS.map(({ mode, label, icon: Icon }) => {
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
            {label}
          </button>
        );
      })}
    </nav>
  );
}
