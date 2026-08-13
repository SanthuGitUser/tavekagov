import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

type PageLoadingProps = {
  label?: string;
  className?: string;
};

export function PageLoading({ label = "Loading…", className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
