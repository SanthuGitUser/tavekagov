import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type SideFilterOption = {
  id: string;
  label: string;
  count: number;
};

type GovPressReleaseSideFiltersProps = {
  title: string;
  options: SideFilterOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
  listClassName?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

export function GovPressReleaseSideFilters({
  title,
  options,
  selectedId,
  onSelect,
  className,
  listClassName,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
}: GovPressReleaseSideFiltersProps) {
  const isSearchable = onSearchChange != null;
  const hasQuery = Boolean(search?.trim());

  if (options.length === 0 && !isSearchable && !hasQuery) {
    return null;
  }

  return (
    <div className={cn("flex shrink-0 flex-col", className)}>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>

      {isSearchable ? (
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search ?? ""}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 pl-7 text-xs"
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-y-auto rounded-lg border border-border bg-card pr-1",
          listClassName ?? "max-h-[min(50vh,420px)]",
        )}
      >
        {options.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {options.map((option) => {
              const isSelected = selectedId === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(option.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors",
                      isSelected
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-accent/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 leading-snug">{option.label}</span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums",
                        isSelected ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      ({option.count})
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
