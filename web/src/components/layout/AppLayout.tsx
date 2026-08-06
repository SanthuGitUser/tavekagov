import { Outlet } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { TopNav } from "@/components/layout/TopNav";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

type AppLayoutProps = {
  title: string;
  description?: ReactNode;
  fillViewport?: boolean;
  hidePageHeader?: boolean;
};

export function AppLayout({
  title,
  description,
  fillViewport = false,
  hidePageHeader = false,
}: AppLayoutProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        fillViewport ? "h-screen overflow-hidden" : "min-h-screen",
      )}
    >
      <TopNav />
      {hidePageHeader ? null : <Header title={title} description={description} />}
      <main
        className={cn(
          "flex-1",
          fillViewport
            ? "flex min-h-0 flex-col overflow-hidden p-2 sm:p-3"
            : "p-3 sm:p-4",
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
