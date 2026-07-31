import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getCategoryColor,
  getDailyCategoryCounts,
  NEWS_CHART_RANGE_OPTIONS,
  type NewsChartRange,
} from "@/components/news/newsChartUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/types/news";

type NewsCategoryChartProps = {
  articles: NewsArticle[];
};

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTooltipDate(value: string): string {
  const [year, month, day] = value.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCategoryLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  name?: string;
  value?: number;
};

function CategoryTooltip({
  active,
  label,
  payload,
  focusedCategory,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  focusedCategory: string | null;
}) {
  if (!active || !label || !payload?.length) return null;

  const items = payload
    .filter((item) => typeof item.value === "number" && item.value > 0)
    .filter((item) => !focusedCategory || String(item.dataKey) === focusedCategory)
    .sort((left, right) => (right.value ?? 0) - (left.value ?? 0));

  const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm">
      <p className="mb-2 font-medium">{formatTooltipDate(String(label))}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <div key={String(item.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="capitalize">{formatCategoryLabel(String(item.dataKey))}</span>
            </span>
            <span className="tabular-nums font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 font-medium">
        Total articles: {total}
      </div>
    </div>
  );
}

export function NewsCategoryChart({ articles }: NewsCategoryChartProps) {
  const [range, setRange] = useState<NewsChartRange>("7d");
  const [focusedCategory, setFocusedCategory] = useState<string | null>(null);

  const { chartData, categories } = useMemo(
    () => getDailyCategoryCounts(articles, { range }),
    [articles, range],
  );

  const categoryColors = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category, index) => [category, getCategoryColor(category, index)]),
      ),
    [categories],
  );

  function handleCategoryClick(category: string) {
    setFocusedCategory((current) => (current === category ? null : category));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>News articles by category (daily)</CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(event) => {
              setRange(event.target.value as NewsChartRange);
              setFocusedCategory(null);
            }}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="News chart date range"
          >
            {NEWS_CHART_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button asChild variant="ghost" size="sm">
            <Link to="/news">View news</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-80">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No news data yet. Run the Tamil Nadu news fetch script to populate daily JSON files.
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {categories.map((category) => {
                const isFocused = focusedCategory === category;
                const isFaded = focusedCategory !== null && !isFocused;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryClick(category)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs transition-opacity",
                      isFaded ? "opacity-30" : "opacity-100",
                      isFocused ? "font-semibold" : "font-medium text-muted-foreground",
                    )}
                    aria-pressed={isFocused}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: categoryColors[category] }}
                    />
                    <span className="capitalize">{formatCategoryLabel(category)}</span>
                  </button>
                );
              })}
            </div>
            <div className="h-[calc(100%-2rem)]">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<CategoryTooltip focusedCategory={focusedCategory} />} />
                {categories.map((category) => {
                  const isFaded = focusedCategory !== null && focusedCategory !== category;

                  return (
                    <Bar
                      key={category}
                      dataKey={category}
                      stackId="news"
                      fill={categoryColors[category]}
                      name={category}
                      fillOpacity={isFaded ? 0.15 : 1}
                      stroke={isFaded ? categoryColors[category] : undefined}
                      strokeWidth={isFaded ? 0 : undefined}
                    />
                  );
                })}
              </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
