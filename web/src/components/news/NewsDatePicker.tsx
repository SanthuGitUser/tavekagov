import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export type NewsDateRange = {
  from: string;
  to: string;
};

type NewsDatePickerProps = {
  value: NewsDateRange;
  onChange: (range: NewsDateRange) => void;
  availableDates?: string[];
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const PANEL_WIDTH = 320;
const PANEL_GAP = 8;

function parseIsoDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function normalizeRange(from: Date, to: Date): NewsDateRange {
  if (isBefore(to, from)) {
    return { from: toIsoDate(to), to: toIsoDate(from) };
  }
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function shiftRangeByDays(range: NewsDateRange, deltaDays: number, today: Date): NewsDateRange {
  const from = parseIsoDate(range.from || range.to);
  const to = parseIsoDate(range.to || range.from);
  let newFrom = addDays(from, deltaDays);
  let newTo = addDays(to, deltaDays);

  if (isAfter(startOfDay(newTo), startOfDay(today))) {
    const daysUntilToday = Math.floor(
      (startOfDay(today).getTime() - startOfDay(to).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysUntilToday <= 0) return range;
    newFrom = addDays(from, daysUntilToday);
    newTo = addDays(to, daysUntilToday);
  }

  return normalizeRange(newFrom, newTo);
}

function canShiftRangeForward(range: NewsDateRange, today: Date): boolean {
  const to = parseIsoDate(range.to || range.from);
  return isBefore(startOfDay(to), startOfDay(today));
}

function formatRangeLabel(range: NewsDateRange): string {
  const from = parseIsoDate(range.from);
  const to = parseIsoDate(range.to);
  if (range.from === range.to) {
    return format(from, "MMM d, yyyy");
  }
  if (format(from, "yyyy") === format(to, "yyyy")) {
    if (format(from, "MMM") === format(to, "MMM")) {
      return `${format(from, "MMM d")} – ${format(to, "d, yyyy")}`;
    }
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  }
  return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
}

function NavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-card"
    >
      {children}
    </button>
  );
}

function DayNavButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-9 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function NewsDatePicker({ value, onChange, availableDates = [] }: NewsDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseIsoDate(value.from || value.to));
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => startOfDay(new Date()), []);
  const availableDateSet = useMemo(() => new Set(availableDates), [availableDates]);
  const canGoForward = useMemo(() => canShiftRangeForward(value, today), [value, today]);

  const selectedFrom = value.from ? parseIsoDate(value.from) : null;
  const selectedTo = value.to ? parseIsoDate(value.to) : null;

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [viewDate]);

  const updatePanelPosition = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const left = Math.max(
      8,
      Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8),
    );

    setPanelPosition({
      top: rect.bottom + PANEL_GAP,
      left,
    });
  };

  useEffect(() => {
    if (value.from) {
      setViewDate(parseIsoDate(value.from));
    }
  }, [value.from]);

  useEffect(() => {
    if (!open) {
      setDraftStart(null);
      setPanelPosition(null);
      return;
    }

    updatePanelPosition();

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleLayoutChange() {
      updatePanelPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleLayoutChange);
    window.addEventListener("scroll", handleLayoutChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleLayoutChange);
      window.removeEventListener("scroll", handleLayoutChange, true);
    };
  }, [open]);

  function openPicker() {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = Math.max(
        8,
        Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8),
      );
      setPanelPosition({
        top: rect.bottom + PANEL_GAP,
        left,
      });
    }
    setOpen(true);
  }

  function shiftDay(deltaDays: number) {
    if (!value.from && !value.to) return;
    setDraftStart(null);
    onChange(shiftRangeByDays(value, deltaDays, today));
  }

  function handleDayClick(day: Date) {
    if (isAfter(day, today)) return;
    const iso = toIsoDate(day);

    if (!draftStart) {
      setDraftStart(day);
      onChange({ from: iso, to: iso });
      return;
    }

    if (isSameDay(draftStart, day)) {
      setDraftStart(null);
      setOpen(false);
      return;
    }

    onChange(normalizeRange(draftStart, day));
    setDraftStart(null);
    setOpen(false);
  }

  function getDayState(day: Date) {
    const isFuture = isAfter(day, today);
    const inCurrentMonth = isSameMonth(day, viewDate);
    const hasArticles = availableDateSet.has(toIsoDate(day));

    let isStart = false;
    let isEnd = false;
    let inRange = false;

    if (selectedFrom && selectedTo) {
      const interval = { start: selectedFrom, end: selectedTo };
      isStart = isSameDay(day, selectedFrom);
      isEnd = isSameDay(day, selectedTo);
      inRange =
        isWithinInterval(day, interval)
        && !isStart
        && !isEnd
        && selectedFrom.getTime() !== selectedTo.getTime();
    }

    if (draftStart && isSameDay(day, draftStart)) {
      isStart = true;
      isEnd = true;
    }

    return { isFuture, inCurrentMonth, hasArticles, isStart, isEnd, inRange };
  }

  const panel =
    open && panelPosition
      ? createPortal(
          <div
            ref={panelRef}
            className="fixed z-[100] w-[320px] rounded-xl border border-border bg-card p-4 shadow-lg"
            style={{ top: panelPosition.top, left: panelPosition.left }}
            role="dialog"
            aria-label="Choose date range"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <NavButton label="Previous year" onClick={() => setViewDate(subYears(viewDate, 1))}>
                  <ChevronsLeft className="h-4 w-4" />
                </NavButton>
                <NavButton
                  label="Previous month"
                  onClick={() => setViewDate(subMonths(viewDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </NavButton>
              </div>

              <p className="text-sm font-semibold text-foreground">
                {format(viewDate, "MMMM yyyy")}
              </p>

              <div className="flex items-center gap-1">
                <NavButton label="Next month" onClick={() => setViewDate(addMonths(viewDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </NavButton>
                <NavButton label="Next year" onClick={() => setViewDate(addYears(viewDate, 1))}>
                  <ChevronsRight className="h-4 w-4" />
                </NavButton>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((weekday) => (
                <div
                  key={weekday}
                  className="py-1 text-center text-xs font-medium text-muted-foreground"
                >
                  {weekday}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1">
              {calendarDays.map((day) => {
                const { isFuture, inCurrentMonth, hasArticles, isStart, isEnd, inRange } =
                  getDayState(day);
                const isSelectedEndpoint = isStart || isEnd;

                return (
                  <div key={day.toISOString()} className="relative flex justify-center px-0.5">
                    {inRange ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 right-0 bg-primary/10"
                      />
                    ) : null}

                    <button
                      type="button"
                      disabled={isFuture}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "relative z-10 flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors",
                        !inCurrentMonth && "text-muted-foreground/35",
                        inCurrentMonth && !isSelectedEndpoint && !inRange && "text-foreground",
                        inCurrentMonth && hasArticles && !isSelectedEndpoint && "font-semibold",
                        inRange && "text-primary",
                        isSelectedEndpoint && "bg-primary text-primary-foreground font-semibold",
                        isFuture && "cursor-not-allowed opacity-30",
                        !isFuture && !isSelectedEndpoint && "hover:bg-accent",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Click once for a single day, or pick a start and end date
            </p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={containerRef}
        className="inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-md border border-border bg-card shadow-sm"
      >
        <DayNavButton label="Previous day" onClick={() => shiftDay(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </DayNavButton>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (open) {
              setOpen(false);
              return;
            }
            openPicker();
          }}
          className="inline-flex min-w-[168px] flex-1 items-center gap-2 border-x border-border px-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30"
          aria-label="Select date range"
          aria-expanded={open}
        >
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-left">
            {value.from ? formatRangeLabel(value) : "Pick dates"}
          </span>
        </button>

        <DayNavButton
          label="Next day"
          disabled={!canGoForward}
          onClick={() => shiftDay(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </DayNavButton>
      </div>
      {panel}
    </>
  );
}

export function isDateInNewsRange(articleDate: string, range: NewsDateRange): boolean {
  if (!range.from && !range.to) return true;
  const from = range.from || range.to;
  const to = range.to || range.from;
  return articleDate >= from && articleDate <= to;
}
