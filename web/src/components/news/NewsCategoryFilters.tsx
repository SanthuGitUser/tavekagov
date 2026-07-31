import { Badge } from "@/components/ui/badge";

import type { NewsFilter } from "@/components/news/newsFilterUtils";
type NewsCategoryFiltersProps = {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  filters: NewsFilter[];
};

export function NewsCategoryFilters({
  activeCategory,
  onCategoryChange,
  filters,
}: NewsCategoryFiltersProps) {
  const activeFilter = filters.find((filter) => filter.id === activeCategory);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onCategoryChange("all")}
        className={
          activeCategory === "all"
            ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
            : "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        }
      >
        All categories
      </button>
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onCategoryChange(filter.id)}
          className={
            activeCategory === filter.id
              ? "rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
              : "rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          }
        >
          <span className="capitalize">{filter.label}</span>
          <span className="ml-1 tabular-nums opacity-70">({filter.count})</span>
        </button>
      ))}
      {activeCategory !== "all" && activeFilter ? (
        <Badge variant="outline" className="self-center">
          Filter:{" "}
          <span className="capitalize">{activeFilter.label}</span>
        </Badge>
      ) : null}
    </div>
  );
}
