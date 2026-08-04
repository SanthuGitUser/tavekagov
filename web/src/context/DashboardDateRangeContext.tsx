import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import type { NewsDateRange } from "@/components/news/NewsDatePicker";

export type DashboardDateRangePreset =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "3m"
  | "6m"
  | "custom";

export type DashboardDateRangeState = {
  preset: DashboardDateRangePreset;
  setPreset: (preset: DashboardDateRangePreset) => void;
  customRange: NewsDateRange;
  setCustomRange: (range: NewsDateRange) => void;
  /** Effective ISO range for filtering (inclusive). `null` means "All". */
  effectiveRange: { from: string; to: string } | null;
};

const DashboardDateRangeContext = createContext<DashboardDateRangeState | null>(null);

function getTodayInKolkataIso(): string {
  // `en-CA` formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseIsoParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  return { y, m, d };
}

function addDaysIso(iso: string, deltaDays: number): string {
  const { y, m, d } = parseIsoParts(iso);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + deltaDays);
  return utc.toISOString().slice(0, 10);
}

function resolveEffectiveRange(
  preset: DashboardDateRangePreset,
  customRange: NewsDateRange,
): { from: string; to: string } | null {
  if (preset === "all") return null;

  const today = getTodayInKolkataIso();

  if (preset === "today") {
    return { from: today, to: today };
  }

  if (preset === "custom") {
    if (!customRange.from || !customRange.to) return { from: today, to: today };
    return customRange.from <= customRange.to
      ? { from: customRange.from, to: customRange.to }
      : { from: customRange.to, to: customRange.from };
  }

  const dayCount =
    preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "3m" ? 90 : 180;
  return { from: addDaysIso(today, -(dayCount - 1)), to: today };
}

export function DashboardDateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<DashboardDateRangePreset>("7d");
  const [customRange, setCustomRange] = useState<NewsDateRange>(() => {
    const today = getTodayInKolkataIso();
    return { from: today, to: today };
  });

  const effectiveRange = useMemo(
    () => resolveEffectiveRange(preset, customRange),
    [preset, customRange],
  );

  const value: DashboardDateRangeState = useMemo(
    () => ({ preset, setPreset, customRange, setCustomRange, effectiveRange }),
    [preset, customRange, effectiveRange],
  );

  return (
    <DashboardDateRangeContext.Provider value={value}>
      {children}
    </DashboardDateRangeContext.Provider>
  );
}

export function useDashboardDateRange(): DashboardDateRangeState | null {
  return useContext(DashboardDateRangeContext);
}

