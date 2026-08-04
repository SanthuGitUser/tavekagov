import { format, parseISO } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  availableMonths: string[];
  className?: string;
};

function parseMonth(value: string): Date {
  return parseISO(`${value}-01T00:00:00`);
}

function findAdjacentMonth(
  availableMonths: string[],
  current: string,
  direction: -1 | 1,
): string | null {
  const sorted = [...availableMonths].sort((a, b) => a.localeCompare(b));
  if (sorted.length === 0 || !current) return null;

  const index = sorted.indexOf(current);
  if (index === -1) {
    if (direction === -1) {
      const older = sorted.filter((month) => month < current);
      return older.length > 0 ? older[older.length - 1] : null;
    }
    const newer = sorted.filter((month) => month > current);
    return newer.length > 0 ? newer[0] : null;
  }

  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= sorted.length) return null;
  return sorted[nextIndex];
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
      className="inline-flex h-9 w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function MonthPicker({
  value,
  onChange,
  availableMonths,
  className,
}: MonthPickerProps) {
  const sortedMonths = useMemo(
    () => [...availableMonths].sort((a, b) => a.localeCompare(b)),
    [availableMonths],
  );

  const canGoBack = findAdjacentMonth(sortedMonths, value, -1) !== null;
  const canGoForward = findAdjacentMonth(sortedMonths, value, 1) !== null;

  const shiftMonth = (direction: -1 | 1) => {
    const next = findAdjacentMonth(sortedMonths, value, direction);
    if (next) onChange(next);
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-md border border-border bg-card shadow-sm",
        className,
      )}
    >
      <NavButton label="Previous month" disabled={!canGoBack} onClick={() => shiftMonth(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </NavButton>

      <div className="inline-flex min-w-[132px] items-center gap-2 border-x border-border px-3 text-sm">
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{value ? format(parseMonth(value), "MMM yyyy") : "Pick month"}</span>
      </div>

      <NavButton label="Next month" disabled={!canGoForward} onClick={() => shiftMonth(1)}>
        <ChevronRight className="h-4 w-4" />
      </NavButton>
    </div>
  );
}
