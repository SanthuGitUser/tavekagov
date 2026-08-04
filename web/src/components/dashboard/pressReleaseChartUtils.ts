import { format, parseISO, subDays } from "date-fns";

import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import type { PressRelease } from "@/types/models";

export type DailyDepartmentRow = {
  date: string;
  total: number;
  [department: string]: string | number;
};

type ChartResult = {
  chartData: DailyDepartmentRow[];
  departments: string[];
};

function normalizeDepartmentName(value: string | null | undefined): string {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || "Unknown";
}

function departmentLabel(release: PressRelease): string {
  const deptId = release.department_id;
  if (typeof deptId === "number" && Number.isFinite(deptId)) {
    const dept = tamilNaduDepartmentsFeed.departments.find((d) => d.id === deptId);
    if (dept?.name) return normalizeDepartmentName(dept.name);
  }
  return normalizeDepartmentName(release.department_name);
}

function getEarliestReleaseDate(releases: PressRelease[]): string | null {
  const dates = releases.map((r) => r.pr_date).sort();
  return dates[0] ?? null;
}

function getLatestReleaseDate(releases: PressRelease[]): string | null {
  const dates = releases.map((r) => r.pr_date).sort();
  return dates.at(-1) ?? null;
}

function getDatesInRange(endDate: string, dayCount: number): string[] {
  const end = parseISO(endDate);
  return Array.from({ length: dayCount }, (_, index) =>
    format(subDays(end, dayCount - 1 - index), "yyyy-MM-dd"),
  );
}

export function getDailyDepartmentCounts(
  releases: PressRelease[],
  options?: { dateRange?: { from: string; to: string } | null; topN?: number },
): ChartResult {
  const topN = options?.topN ?? 6;

  const dateRangeKeyPresent =
    options != null && Object.prototype.hasOwnProperty.call(options, "dateRange");
  const dateRange = options?.dateRange ?? null;

  const filtered = dateRangeKeyPresent
    ? dateRange === null
      ? releases
      : releases.filter((release) => release.pr_date >= dateRange.from && release.pr_date <= dateRange.to)
    : releases;

  if (filtered.length === 0) return { chartData: [], departments: [] };

  // Totals per department
  const totals = new Map<string, number>();
  for (const release of filtered) {
    const dept = departmentLabel(release);
    totals.set(dept, (totals.get(dept) ?? 0) + 1);
  }

  const rankedDepartments = [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([dept]) => dept);

  const topDepartments = rankedDepartments.slice(0, topN);
  const hasOther = rankedDepartments.length > topDepartments.length;
  const departments = hasOther ? [...topDepartments, "Other"] : topDepartments;

  let rangeStart: string;
  let rangeEnd: string;
  let rangeDates: string[];

  const hasDateRangeKey =
    options != null && Object.prototype.hasOwnProperty.call(options, "dateRange");
  const configured = options?.dateRange ?? null;

  if (hasDateRangeKey) {
    if (configured === null) {
      const earliest = getEarliestReleaseDate(filtered);
      const latest = getLatestReleaseDate(filtered);
      if (!earliest || !latest) return { chartData: [], departments: [] };
      rangeStart = earliest;
      rangeEnd = latest;
    } else {
      rangeStart = configured.from <= configured.to ? configured.from : configured.to;
      rangeEnd = configured.from <= configured.to ? configured.to : configured.from;
      const latest = getLatestReleaseDate(filtered);
      if (latest && rangeEnd > latest) rangeEnd = latest;
    }
  } else {
    const earliest = getEarliestReleaseDate(filtered);
    const latest = getLatestReleaseDate(filtered);
    if (!earliest || !latest) return { chartData: [], departments: [] };
    rangeStart = earliest;
    rangeEnd = latest;
  }

  const dayCount =
    Math.floor(
      (parseISO(rangeEnd).getTime() - parseISO(rangeStart).getTime()) / (24 * 60 * 60 * 1000),
    ) + 1;
  rangeDates = getDatesInRange(rangeEnd, Math.max(0, dayCount)).filter(
    (d) => d >= rangeStart && d <= rangeEnd,
  );

  const byDay = new Map<string, Map<string, number>>();
  for (const release of filtered) {
    const day = release.pr_date;
    const deptRaw = departmentLabel(release);
    const dept = topDepartments.includes(deptRaw) ? deptRaw : "Other";

    if (!byDay.has(day)) byDay.set(day, new Map());
    const dayMap = byDay.get(day)!;
    dayMap.set(dept, (dayMap.get(dept) ?? 0) + 1);
  }

  const chartData: DailyDepartmentRow[] = rangeDates.map((date) => {
    const dayMap = byDay.get(date);
    const row: DailyDepartmentRow = { date, total: 0 };
    for (const dept of departments) {
      const count = dayMap?.get(dept) ?? 0;
      row[dept] = count;
      row.total += count;
    }
    return row;
  });

  return { chartData, departments };
}

