import { segmentedGroupClass, segmentedItemClass } from "@/lib/navStyles";
import { cn } from "@/lib/utils";

export type ElectionResultsViewTab = "may-2026" | "bye-2026";

type ElectionResultsViewTabsProps = {
  activeTab: ElectionResultsViewTab;
  onTabChange: (tab: ElectionResultsViewTab) => void;
  className?: string;
};

const TAB_OPTIONS: { id: ElectionResultsViewTab; label: string }[] = [
  { id: "may-2026", label: "May 2026" },
  { id: "bye-2026", label: "By-election 2026" },
];

export function ElectionResultsViewTabs({
  activeTab,
  onTabChange,
  className,
}: ElectionResultsViewTabsProps) {
  return (
    <nav
      className={cn(segmentedGroupClass, className)}
      role="tablist"
      aria-label="Election period"
    >
      {TAB_OPTIONS.map(({ id, label }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(id)}
            className={segmentedItemClass(isActive)}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
