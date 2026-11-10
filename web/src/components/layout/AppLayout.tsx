import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Header } from "@/components/layout/Header";
import { TopNav } from "@/components/layout/TopNav";
import { PageLoading } from "@/components/shared/PageLoading";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

/**
 * Persistent shell: the top bar is rendered once and stays mounted while only the
 * content area below it changes. The content area is the scroll container.
 *
 * The single Suspense boundary here is already showing content after the first
 * page, so when a lazily loaded page is opened React keeps the current page on
 * screen until the new one is ready, instead of flashing a spinner.
 */
export function RootLayout() {
  const { pathname } = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to main content
      </a>
      <TopNav />
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <Suspense fallback={<PageLoading className="m-3 flex-1 sm:m-4" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}

type AppLayoutProps = {
  title: string;
  description?: ReactNode;
  fillViewport?: boolean;
  hidePageHeader?: boolean;
};

/** Per-page frame: page header (title, filters) and the page body. */
export function AppLayout({
  title,
  description,
  fillViewport = false,
  hidePageHeader = false,
}: AppLayoutProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col",
        fillViewport && "min-h-0 overflow-hidden",
      )}
    >
      {hidePageHeader ? null : <Header title={title} description={description} />}
      <main
        id="main-content"
        tabIndex={-1}
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
