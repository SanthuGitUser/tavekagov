import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SourceLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function SourceLink({ href, children, className }: SourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn("font-medium text-primary hover:underline", className)}
    >
      {children}
    </a>
  );
}
