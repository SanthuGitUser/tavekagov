import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ElectionRoundSliderProps = {
  round: number;
  totalRounds: number;
  onRoundChange: (round: number) => void;
  className?: string;
};

function MilestoneDot({ state }: { state: "done" | "current" | "upcoming" }) {
  if (state === "current") {
    return (
      <span
        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background shadow-sm"
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </span>
    );
  }
  if (state === "done") {
    return (
      <span className="h-2 w-2 shrink-0 rounded-full bg-primary/75" aria-hidden />
    );
  }
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full border border-muted-foreground/50 bg-background"
      aria-hidden
    />
  );
}

export function ElectionRoundSlider({
  round,
  totalRounds,
  onRoundChange,
  className,
}: ElectionRoundSliderProps) {
  const safeTotal = Math.max(1, totalRounds);
  const safeRound = Math.min(Math.max(1, round), safeTotal);
  const progressPercent =
    safeTotal <= 1 ? 100 : Math.round(((safeRound - 1) / (safeTotal - 1)) * 100);
  const isFinal = safeRound === safeTotal;
  const rounds = Array.from({ length: safeTotal }, (_, index) => index + 1);
  const lineInsetPercent = 50 / safeTotal;
  const progressTrackWidth =
    safeTotal <= 1 ? 0 : ((safeRound - 1) / (safeTotal - 1)) * (100 - 2 * lineInsetPercent);

  return (
    <div
      className={cn(
        "w-full rounded-md border border-border bg-muted/25 px-2 py-1.5 sm:px-3",
        className,
      )}
      role="group"
      aria-label={`EVM counting rounds, round ${safeRound} of ${safeTotal}`}
    >
      <div className="mb-1 flex items-center justify-end gap-1 text-[11px]">
        <div className="flex shrink-0 items-center gap-1 tabular-nums">
          <span className="font-semibold text-foreground">Round {safeRound}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={safeRound <= 1}
            onClick={() => onRoundChange(safeRound - 1)}
            aria-label="Previous round"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={safeRound >= safeTotal}
            onClick={() => onRoundChange(safeRound + 1)}
            aria-label="Next round"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground">of {safeTotal}</span>
          {isFinal ? (
            <span className="ml-0.5 rounded bg-primary/15 px-1 py-px text-[10px] font-semibold text-primary">
              Final
            </span>
          ) : null}
        </div>
      </div>

      <div className="relative w-full pt-0.5 pb-0.5">
        <div
          className="pointer-events-none absolute top-[9px] h-px bg-border"
          style={{
            left: `${lineInsetPercent}%`,
            right: `${lineInsetPercent}%`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-[9px] h-px bg-primary/40 transition-[width] duration-150"
          style={{
            left: `${lineInsetPercent}%`,
            width: `${progressTrackWidth}%`,
          }}
          aria-hidden
        />
        <div className="relative z-10 flex w-full items-start justify-between gap-0">
          {rounds.map((roundIndex) => {
            const state =
              roundIndex < safeRound
                ? "done"
                : roundIndex === safeRound
                  ? "current"
                  : "upcoming";
            return (
              <button
                key={roundIndex}
                type="button"
                onClick={() => onRoundChange(roundIndex)}
                aria-label={`Round ${roundIndex}`}
                aria-current={roundIndex === safeRound ? "step" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-sm px-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "hover:opacity-90",
                )}
              >
                <MilestoneDot state={state} />
                <span
                  className={cn(
                    "max-w-full truncate text-[9px] leading-none tabular-nums sm:text-[10px]",
                    roundIndex === safeRound
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  R{roundIndex}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-0.5 text-center text-[9px] tabular-nums text-muted-foreground/80">
        {progressPercent}% · R1→R{safeTotal}
      </p>
    </div>
  );
}
