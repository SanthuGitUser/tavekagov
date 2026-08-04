import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getDailyDepartmentCounts } from "@/components/dashboard/pressReleaseChartUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PressRelease } from "@/types/models";

type ActivityChartProps = {
  releases: PressRelease[];
  dateRange?: { from: string; to: string } | null;
  className?: string;
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

const DEPT_COLORS: Record<string, string> = {
  Other: "#94a3b8",
};

const FALLBACK_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#059669",
  "#ca8a04",
];

function getDeptColor(dept: string, index: number): string {
  return DEPT_COLORS[dept] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]!;
}

type TooltipPayloadItem = {
  color?: string;
  dataKey?: string | number;
  value?: number;
};

function DepartmentTooltip({
  active,
  label,
  payload,
  focusedDepartment,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  focusedDepartment: string | null;
}) {
  if (!active || !label || !payload?.length) return null;

  const items = payload
    .filter((item) => typeof item.value === "number" && item.value > 0)
    .filter((item) => String(item.dataKey) !== "total")
    .filter((item) => !focusedDepartment || String(item.dataKey) === focusedDepartment)
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
              <span className="truncate">{String(item.dataKey)}</span>
            </span>
            <span className="tabular-nums font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 font-medium">
        Total press releases: {total}
      </div>
    </div>
  );
}

export function ActivityChart({ releases, dateRange, className }: ActivityChartProps) {
  const [focusedDepartment, setFocusedDepartment] = useState<string | null>(null);

  const { chartData, departments } = useMemo(
    () => getDailyDepartmentCounts(releases, { dateRange, topN: 6 }),
    [releases, dateRange],
  );

  const colors = useMemo(
    () =>
      Object.fromEntries(
        departments.map((dept, index) => [dept, getDeptColor(dept, index)]),
      ) as Record<string, string>,
    [departments],
  );

  useEffect(() => {
    if (focusedDepartment && !departments.includes(focusedDepartment)) {
      setFocusedDepartment(null);
    }
  }, [departments, focusedDepartment]);

  function handleDepartmentClick(dept: string) {
    setFocusedDepartment((current) => (current === dept ? null : dept));
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Press Releases by Department</CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/press-releases">View press releases</Link>
        </Button>
      </CardHeader>
      <CardContent className="h-80">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No chart data yet. Run the DIPR press release sync script to populate JSON files.
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              {departments.map((dept) => {
                const isFocused = focusedDepartment === dept;
                const isFaded = focusedDepartment !== null && !isFocused;
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => handleDepartmentClick(dept)}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs transition-opacity",
                      isFaded ? "opacity-30" : "opacity-100",
                      isFocused ? "font-semibold" : "font-medium text-muted-foreground",
                    )}
                    aria-pressed={isFocused}
                    title={dept}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: colors[dept] }}
                    />
                    <span className="max-w-[14rem] truncate">{dept}</span>
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
                  <Tooltip content={<DepartmentTooltip focusedDepartment={focusedDepartment} />} />
                  {departments.map((dept) => {
                    const isFaded = focusedDepartment !== null && focusedDepartment !== dept;
                    return (
                      <Bar
                        key={dept}
                        dataKey={dept}
                        stackId="press"
                        fill={colors[dept]}
                        name={dept}
                        fillOpacity={isFaded ? 0.15 : 1}
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
