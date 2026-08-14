import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  description,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type DashboardWidgetCardProps = {
  title: string;
  description?: string;
  viewAllTo?: string;
  viewAllLabel?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardWidgetCard({
  title,
  description,
  viewAllTo,
  viewAllLabel = "View all",
  children,
  className,
  contentClassName,
}: DashboardWidgetCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {viewAllTo ? (
          <Link
            to={viewAllTo}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function DashboardEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function DashboardListItem({
  title,
  meta,
  href,
  children,
}: {
  title: string;
  meta?: string;
  href?: string;
  children?: ReactNode;
}) {
  const content = (
    <>
      <p className="text-sm font-medium leading-snug text-foreground">{title}</p>
      {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
      {children}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="block rounded-md border border-border/70 bg-background/40 px-3 py-2.5 transition-colors hover:border-primary/25 hover:bg-accent/40"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-md border border-border/70 bg-background/40 px-3 py-2.5">
      {content}
    </div>
  );
}
