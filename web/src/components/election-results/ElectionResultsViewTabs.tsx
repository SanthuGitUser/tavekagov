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
      className={cn("flex gap-0.5 overflow-x-auto", className)}
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
            className={cn(
              "relative shrink-0 px-2.5 pb-1 pt-0 text-xs font-medium transition-colors",
              isActive
                ? "text-primary after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}
