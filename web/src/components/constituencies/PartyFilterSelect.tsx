import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { getPartyFlagUrl } from "@/lib/partyFlagUtils";
import { cn } from "@/lib/utils";

type PartyFilterSelectProps = {
  value: string;
  parties: string[];
  onChange: (value: string) => void;
  className?: string;
};

function PartyFlag({ party, className }: { party: string; className?: string }) {
  const flagUrl = getPartyFlagUrl(party);
  if (!flagUrl) return null;

  return (
    <img
      src={flagUrl}
      alt=""
      className={cn("h-4 w-6 shrink-0 rounded-sm border border-border/60 object-cover", className)}
      loading="lazy"
    />
  );
}

export function PartyFilterSelect({
  value,
  parties,
  onChange,
  className,
}: PartyFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedLabel = value === "all" ? "All parties" : value;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function selectParty(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative min-w-[11rem] shrink-0", open && "z-50")}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 text-left font-normal appearance-none active:bg-background",
          open && "border-ring bg-background ring-2 ring-ring/50",
          className,
        )}
      >
        {value !== "all" ? <PartyFlag party={value} /> : null}
        <span className="min-w-0 flex-1 truncate">{selectedLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 opacity-60 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Filter by party"
          className="absolute left-0 top-[calc(100%+0.25rem)] z-50 max-h-64 w-full min-w-[11rem] overflow-y-auto rounded-md border border-border bg-card p-1 text-foreground shadow-lg"
        >
          <li role="option" aria-selected={value === "all"}>
            <button
              type="button"
              onClick={() => selectParty("all")}
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                value === "all" && "bg-accent/60",
              )}
            >
              <span className="min-w-0 flex-1">All parties</span>
              {value === "all" ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          </li>
          {parties.map((party) => (
            <li key={party} role="option" aria-selected={value === party}>
              <button
                type="button"
                onClick={() => selectParty(party)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                  value === party && "bg-accent/60",
                )}
              >
                <PartyFlag party={party} />
                <span className="min-w-0 flex-1">{party}</span>
                {value === party ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
