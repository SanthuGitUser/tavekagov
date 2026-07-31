import {
  endOfDay,
  format,
  getDate,
  getMonth,
  getYear,
  isAfter,
  parseISO,
  startOfDay,
} from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const ITEM_HEIGHT = 30;
const VISIBLE_HEIGHT = 90;

type VerticalDatePickerProps = {
  availableDates: string[];
  value: string;
  onChange: (isoDate: string) => void;
};

function parseDateValue(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function isFutureDate(date: Date, today: Date): boolean {
  return isAfter(startOfDay(date), startOfDay(today));
}

export function VerticalDatePicker({
  availableDates,
  value,
  onChange,
}: VerticalDatePickerProps) {
  const today = useMemo(() => startOfDay(new Date()), []);

  const validDates = useMemo(
    () =>
      availableDates
        .map(parseDateValue)
        .filter((date) => !isFutureDate(date, today))
        .sort((a, b) => b.getTime() - a.getTime()),
    [availableDates, today],
  );

  const selected = parseDateValue(value);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const date of validDates) {
      set.add(getYear(date));
    }
    return [...set].sort((a, b) => b - a);
  }, [validDates]);

  const months = useMemo(() => {
    const year = getYear(selected);
    const set = new Set<number>();
    for (const date of validDates) {
      if (getYear(date) !== year) continue;
      if (year === getYear(today) && getMonth(date) > getMonth(today)) continue;
      set.add(getMonth(date));
    }
    return [...set].sort((a, b) => b - a);
  }, [validDates, selected, today]);

  const days = useMemo(() => {
    const year = getYear(selected);
    const month = getMonth(selected);
    const set = new Set<number>();
    for (const date of validDates) {
      if (getYear(date) !== year || getMonth(date) !== month) continue;
      if (
        year === getYear(today) &&
        month === getMonth(today) &&
        getDate(date) > getDate(today)
      ) {
        continue;
      }
      set.add(getDate(date));
    }
    return [...set].sort((a, b) => b - a);
  }, [validDates, selected, today]);

  const selectedYear = getYear(selected);
  const selectedMonth = getMonth(selected);
  const selectedDay = getDate(selected);

  function pickYear(year: number) {
    const nextMonth =
      year === getYear(today)
        ? Math.min(selectedMonth, getMonth(today))
        : selectedMonth;
    const nextDay = resolveDay(year, nextMonth, selectedDay, validDates, today);
    onChange(toIsoDate(new Date(year, nextMonth, nextDay)));
  }

  function pickMonth(month: number) {
    const nextDay = resolveDay(selectedYear, month, selectedDay, validDates, today);
    onChange(toIsoDate(new Date(selectedYear, month, nextDay)));
  }

  function pickDay(day: number) {
    onChange(toIsoDate(new Date(selectedYear, selectedMonth, day)));
  }

  return (
    <div className="w-[128px] space-y-1.5">
      <YearPicker
        years={years.map(String)}
        selected={String(selectedYear)}
        onSelect={(item) => pickYear(Number(item))}
      />

      <div className="grid grid-cols-[44px_1fr] gap-1.5">
        <PickerColumn
          label="Day"
          items={days.map(String)}
          selected={String(selectedDay)}
          onSelect={(item) => pickDay(Number(item))}
          formatSelected={(item) => item.padStart(2, "0")}
        />
        <PickerColumn
          label="Month"
          items={months.map(String)}
          selected={String(selectedMonth)}
          onSelect={(item) => pickMonth(Number(item))}
          formatSelected={(item) => MONTHS_SHORT[Number(item)]}
          formatOption={(item) => MONTHS_SHORT[Number(item)]}
        />
      </div>
    </div>
  );
}

type YearPickerProps = {
  years: string[];
  selected: string;
  onSelect: (year: string) => void;
};

function YearPicker({ years, selected, onSelect }: YearPickerProps) {
  const index = years.indexOf(selected);

  function step(delta: number) {
    const next = years[index + delta];
    if (next) onSelect(next);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/15">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={index <= 0}
        className="flex w-full items-center justify-center py-0.5 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
        aria-label="Previous year"
      >
        <ChevronUp className="h-3 w-3" />
      </button>
      <div className="flex h-8 items-center justify-center border-y border-border/70 bg-card text-sm font-semibold">
        {selected}
      </div>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={index >= years.length - 1}
        className="flex w-full items-center justify-center py-0.5 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
        aria-label="Next year"
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}

type PickerColumnProps = {
  label: string;
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
  formatSelected?: (item: string) => string;
  formatOption?: (item: string) => string;
};

function PickerColumn({
  label,
  items,
  selected,
  onSelect,
  formatSelected,
  formatOption,
}: PickerColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const display = formatSelected ?? ((item: string) => item);
  const optionLabel = formatOption ?? ((item: string) => item);

  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const index = items.indexOf(selected);
    if (index === -1) return;
    container.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
  }, [items, selected]);

  function scrollBy(delta: number) {
    const index = items.indexOf(selected);
    if (index === -1) return;
    const next = items[index + delta];
    if (next) onSelect(next);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-1 py-2 text-center text-[10px] text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-muted/15">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={items.indexOf(selected) <= 0}
        className="flex w-full items-center justify-center py-0.5 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
        aria-label={`Previous ${label}`}
      >
        <ChevronUp className="h-3 w-3" />
      </button>

      <div className="relative" style={{ height: VISIBLE_HEIGHT }}>
        <div className="pointer-events-none absolute inset-x-1 top-1/2 z-10 h-7 -translate-y-1/2 rounded border border-primary/20 bg-card" />
        <div
          ref={listRef}
          className="h-full overflow-y-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{
            paddingTop: (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2,
            paddingBottom: (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2,
          }}
        >
          {items.map((item) => {
            const isSelected = item === selected;
            return (
              <button
                key={item}
                type="button"
                onClick={() => onSelect(item)}
                style={{ height: ITEM_HEIGHT }}
                className={cn(
                  "flex w-full items-center justify-center px-0.5 text-xs transition-colors",
                  isSelected
                    ? "relative z-20 font-bold text-primary"
                    : "text-muted-foreground/80 hover:text-foreground",
                )}
              >
                {isSelected ? display(item) : optionLabel(item)}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={items.indexOf(selected) >= items.length - 1}
        className="flex w-full items-center justify-center py-0.5 text-muted-foreground hover:bg-muted/40 disabled:opacity-30"
        aria-label={`Next ${label}`}
      >
        <ChevronDown className="h-3 w-3" />
      </button>
    </div>
  );
}

function resolveDay(
  year: number,
  month: number,
  preferredDay: number,
  validDates: Date[],
  today: Date,
): number {
  const candidates = validDates
    .filter((date) => getYear(date) === year && getMonth(date) === month)
    .filter((date) => !isFutureDate(date, today))
    .map((date) => getDate(date));

  if (candidates.length === 0) return 1;
  if (candidates.includes(preferredDay)) return preferredDay;
  return candidates.sort((a, b) => b - a)[0];
}

export function getLatestValidDate(availableDates: string[]): string | null {
  const today = endOfDay(new Date());
  const valid = availableDates
    .map(parseDateValue)
    .filter((date) => !isAfter(date, today))
    .sort((a, b) => b.getTime() - a.getTime());
  return valid.length > 0 ? toIsoDate(valid[0]) : null;
}

function formatPrNumber(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(\d+)\s*$/);
  return match ? match[1] : value;
}

export { formatPrNumber };
