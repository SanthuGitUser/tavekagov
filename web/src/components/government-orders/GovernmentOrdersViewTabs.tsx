import { CalendarDays, Building2 } from "lucide-react";

import type { GovernmentOrdersViewMode } from "@/context/GovernmentOrdersViewContext";
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
      className={cn("flex gap-1 overflow-x-auto", className)}
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
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 px-2.5 pb-1.5 pt-0.5 text-xs font-medium transition-colors",
              isActive
                ? "text-primary after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
