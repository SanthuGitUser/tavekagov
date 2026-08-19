import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  matchCategory?: string;
};

export type NavPrimaryItem = {
  id: string;
  label: string;
  to?: string;
  items?: NavItem[];
};

export const primaryNav: NavPrimaryItem[] = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "news", label: "News", to: "/news" },
  {
    id: "publications",
    label: "Govt Publications",
    items: [
      { to: "/press-releases", label: "Press Releases" },
      { to: "/gov-press-releases", label: "Press Release Images" },
      { to: "/dvac-press-releases", label: "DVAC" },
      { to: "/finance-notifications", label: "Finance" },
      { to: "/government-orders", label: "Government Orders" },
      { to: "/transfers-postings", label: "IAS Transfers and Postings" },
      { to: "/govt-schemes", label: "Government Schemes" },
      { to: "/magazine", label: "Magazines" },
    ],
  },
  {
    id: "administration",
    label: "Govt Administration",
    items: [
      { to: "/ministers", label: "Ministers" },
      { to: "/departments", label: "Departments" },
      { to: "/constituencies", label: "Constituencies" },
      { to: "/districts", label: "Districts" },
      { to: "/mla", label: "MLA" },
    ],
  },
  { id: "tvk-manifesto", label: "TVK Manifesto", to: "/tvk-manifesto" },
  { id: "about", label: "About", to: "/about" },
];

export const tvkManifestoSubNav: NavItem[] = [
  { to: "/tvk-manifesto", label: "All", matchCategory: "all" },
  { to: "/tvk-manifesto", label: "Aram(Virtue)", matchCategory: "Aram(Virtue)" },
  { to: "/tvk-manifesto", label: "Inbam(Joy/Well-Being)", matchCategory: "Inbam(Joy/Well-Being)" },
  { to: "/tvk-manifesto", label: "Porul(Wealth/Economy)", matchCategory: "Porul(Wealth/Economy)" },
];

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function resolvePrimaryId(pathname: string): string | null {
  for (const item of primaryNav) {
    if (item.to && isActivePath(pathname, item.to)) return item.id;
    if (item.items?.some((sub) => isActivePath(pathname, sub.to))) return item.id;
  }
  return null;
}

function isSubNavItemActive(pathname: string, search: string, sub: NavItem): boolean {
  const basePath = sub.to.split("?")[0] ?? sub.to;
  if (!isActivePath(pathname, basePath)) return false;

  if (sub.matchCategory !== undefined) {
    const params = new URLSearchParams(search);
    const currentCategory = params.get("category") ?? "all";
    return currentCategory === sub.matchCategory;
  }

  return isActivePath(pathname, sub.to);
}

function subNavLinkTo(sub: NavItem): string {
  if (sub.matchCategory === undefined) return sub.to;
  if (sub.matchCategory === "all") return sub.to;
  return `${sub.to}?category=${encodeURIComponent(sub.matchCategory)}`;
}

function resolveSubItems(pathname: string, activePrimaryId: string | null): NavItem[] {
  if (activePrimaryId === "tvk-manifesto" && isActivePath(pathname, "/tvk-manifesto")) {
    return tvkManifestoSubNav;
  }

  const activePrimary = primaryNav.find((item) => item.id === activePrimaryId);
  return activePrimary?.items ?? [];
}

function primaryLinkTo(item: NavPrimaryItem): string {
  return item.to ?? item.items?.[0]?.to ?? "/";
}

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const activePrimaryId = resolvePrimaryId(location.pathname);
  const subItems = resolveSubItems(location.pathname, activePrimaryId);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-start gap-x-3 gap-y-1.5 px-3 py-2 sm:px-4">
        <Link to="/" className="group col-start-1 row-start-1 min-w-0 shrink-0 self-center">
          <div className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            TavekaGov
          </div>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Tamil Nadu open data</p>
        </Link>

        <nav
          aria-label="Main navigation"
          className="col-start-2 row-start-1 max-w-full justify-self-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-muted/80 p-1 shadow-inner">
            {primaryNav.map((item) => {
              const isActive = item.id === activePrimaryId;
              const linkTo = primaryLinkTo(item);

              return (
                <Link
                  key={item.id}
                  to={linkTo}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium leading-tight transition-all duration-200 sm:px-3 sm:py-1.5 sm:text-sm",
                    isActive
                      ? "border-border bg-card text-foreground shadow-sm"
                      : "border-border/60 text-muted-foreground hover:border-border hover:bg-card/50 hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="col-start-3 row-start-1 h-8 w-8 shrink-0 justify-self-end rounded-full text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {subItems.length > 0 ? (
          <nav
            aria-label="Section navigation"
            className="col-start-2 row-start-2 max-w-full justify-self-center overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="inline-flex min-w-max items-stretch gap-1 rounded-full border border-border/60 bg-muted/40 p-0.5">
              {subItems.map((sub) => {
                const isSubActive = isSubNavItemActive(
                  location.pathname,
                  location.search,
                  sub,
                );

                return (
                  <Link
                    key={`${sub.to}-${sub.matchCategory ?? sub.label}`}
                    to={subNavLinkTo(sub)}
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium leading-tight transition-colors sm:px-2.5 sm:py-1 sm:text-xs",
                      isSubActive
                        ? "border-border bg-card text-foreground shadow-sm"
                        : "border-border/60 text-muted-foreground hover:border-border hover:bg-card/60 hover:text-foreground",
                    )}
                    aria-current={isSubActive ? "page" : undefined}
                  >
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
