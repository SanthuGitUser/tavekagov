import { cn } from "@/lib/utils";

export type DistrictMapMode = "map" | "weather";

type DistrictMapModeTabsProps = {
  mode: DistrictMapMode;
  onModeChange: (mode: DistrictMapMode) => void;
  className?: string;
};

export function DistrictMapModeTabs({
  mode,
  onModeChange,
  className,
}: DistrictMapModeTabsProps) {
  return (
    <div
      className={cn(
        "inline-flex w-fit rounded-lg border-[0.5px] border-border/50 bg-muted/35 p-px",
        className,
      )}
      role="tablist"
      aria-label="District map view"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "map"}
        onClick={() => onModeChange("map")}
        className={cn(
          "rounded-[calc(0.5rem-1px)] px-2.5 py-1 text-xs font-medium transition-colors",
          mode === "map"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Map
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "weather"}
        onClick={() => onModeChange("weather")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[calc(0.5rem-1px)] px-2.5 py-1 text-xs font-medium transition-colors",
          mode === "weather"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_1.5px_rgba(16,185,129,0.2)]"
        />
        Weather Map
      </button>
    </div>
  );
}
