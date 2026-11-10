import { Link, useLocation } from "react-router-dom";
import { Info, Moon, Search, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { t } from "@/i18n/messages";
import { prefetchRoute } from "@/lib/routePrefetch";
import { cn } from "@/lib/utils";

/** Alternative pages shown under one section tab, switched with a segmented control. */
export type NavVariant = {
  to: string;
  label: string;
};

export type NavItem = {
  to: string;
  label: string;
  matchCategory?: string;
  variants?: NavVariant[];
};

export type NavPrimaryItem = {
  id: string;
  label: string;
  to?: string;
  items?: NavItem[];
};

export const primaryNav: NavPrimaryItem[] = [
  { id: "dashboard", label: t("nav.dashboard"), to: "/dashboard" },
  { id: "news", label: t("nav.news"), to: "/news" },
  {
    id: "publications",
    label: t("nav.publications"),
    items: [
      {
        to: "/press-releases",
        label: "Press Releases",
        variants: [
          { to: "/press-releases", label: "DIPR releases" },
          { to: "/gov-press-releases", label: "tn.gov.in images" },
        ],
      },
      { to: "/dvac-press-releases", label: "DVAC" },
      { to: "/finance-notifications", label: "Finance" },
      { to: "/government-orders", label: "Government Orders" },
      { to: "/transfers-postings", label: "IAS Transfers" },
      { to: "/govt-schemes", label: "Schemes" },
      { to: "/magazine", label: "Magazines" },
    ],
  },
  {
    id: "administration",
    label: t("nav.administration"),
    items: [
      { to: "/ministers", label: "Ministers" },
      { to: "/departments", label: "Departments" },
      { to: "/districts", label: "Districts" },
      {
        to: "/constituencies",
        label: "Constituencies & MLAs",
        variants: [
          { to: "/constituencies", label: "Constituencies" },
          { to: "/mla", label: "MLAs" },
        ],
      },
    ],
  },
  { id: "election-results", label: t("nav.electionResults"), to: "/election-results" },
  { id: "tvk-manifesto", label: t("nav.tvkManifesto"), to: "/tvk-manifesto" },
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

function itemPaths(item: NavItem): string[] {
  return item.variants ? item.variants.map((variant) => variant.to) : [item.to];
}

function resolvePrimaryId(pathname: string): string | null {
  for (const item of primaryNav) {
    if (item.to && isActivePath(pathname, item.to)) return item.id;
    if (item.items?.some((sub) => itemPaths(sub).some((to) => isActivePath(pathname, to)))) {
      return item.id;
    }
  }
  return null;
}

function isSubNavItemActive(pathname: string, search: string, sub: NavItem): boolean {
  const basePath = sub.to.split("?")[0] ?? sub.to;
  if (sub.matchCategory !== undefined) {
    if (!isActivePath(pathname, basePath)) return false;
    const currentCategory = new URLSearchParams(search).get("category") ?? "all";
    return currentCategory === sub.matchCategory;
  }
  return itemPaths(sub).some((to) => isActivePath(pathname, to));
}

function subNavLinkTo(sub: NavItem): string {
  if (sub.matchCategory === undefined || sub.matchCategory === "all") return sub.to;
  return `${sub.to}?category=${encodeURIComponent(sub.matchCategory)}`;
}

function resolveSubItems(pathname: string, activePrimaryId: string | null): NavItem[] {
  if (activePrimaryId === "tvk-manifesto" && isActivePath(pathname, "/tvk-manifesto")) {
    return tvkManifestoSubNav;
  }
  return primaryNav.find((item) => item.id === activePrimaryId)?.items ?? [];
}

/** Variants (e.g. Constituencies | MLAs) for the page currently open, if any. */
export function findActiveVariants(pathname: string): NavVariant[] | null {
  for (const primary of primaryNav) {
    for (const item of primary.items ?? []) {
      if (item.variants?.some((variant) => isActivePath(pathname, variant.to))) {
        return item.variants;
      }
    }
  }
  return null;
}

function primaryLinkTo(item: NavPrimaryItem): string {
  return item.to ?? item.items?.[0]?.to ?? "/";
}

function prefetchHandlers(to: string) {
  const warm = () => prefetchRoute(to);
  return { onMouseEnter: warm, onFocus: warm, onTouchStart: warm };
}

const iconLinkClass =
  "inline-flex h-8 items-center gap-1.5 rounded-full px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const activePrimaryId = resolvePrimaryId(location.pathname);
  const subItems = resolveSubItems(location.pathname, activePrimaryId);

  return (
    <header className="z-40 shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      {/* Row 1: fixed height; the menu scrolls sideways on narrow screens instead of wrapping. */}
      <div className="mx-auto flex h-12 max-w-7xl items-stretch gap-3 px-3 sm:px-4">
        <Link to="/" className="group flex shrink-0 flex-col justify-center">
          <span className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            TavekaGov
          </span>
          <span className="hidden text-[10px] text-muted-foreground sm:block">{t("app.tagline")}</span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex min-w-0 flex-1 items-stretch justify-start overflow-x-auto [scrollbar-width:none] md:justify-center [&::-webkit-scrollbar]:hidden"
        >
          {primaryNav.map((item) => {
            const isActive = item.id === activePrimaryId;
            const linkTo = primaryLinkTo(item);
            return (
              <Link
                key={item.id}
                to={linkTo}
                {...prefetchHandlers(linkTo)}
                className={cn(
                  "relative flex shrink-0 items-center whitespace-nowrap px-2.5 text-sm transition-colors sm:px-3",
                  "after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors",
                  isActive
                    ? "font-semibold text-foreground after:bg-primary"
                    : "font-medium text-muted-foreground after:bg-transparent hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-0.5">
          <Link
            to="/search"
            className={cn(iconLinkClass, location.pathname === "/search" && "bg-muted text-foreground")}
            aria-label={t("nav.search")}
            title={t("nav.search")}
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">{t("nav.search")}</span>
          </Link>
          <Link
            to="/about"
            className={cn(iconLinkClass, "w-8 justify-center px-0", location.pathname === "/about" && "bg-muted text-foreground")}
            aria-label={t("nav.about")}
            title={t("nav.about")}
          >
            <Info className="h-4 w-4" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Row 2: always present at a fixed height so pages never jump between sections. */}
      <nav
        aria-label="Section navigation"
        className={cn("h-9", subItems.length > 0 && "border-t border-border/40 bg-muted/30")}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-4 md:justify-center [&::-webkit-scrollbar]:hidden">
          {subItems.map((sub) => {
            const isSubActive = isSubNavItemActive(location.pathname, location.search, sub);
            const linkTo = subNavLinkTo(sub);
            return (
              <Link
                key={`${sub.to}-${sub.matchCategory ?? sub.label}`}
                to={linkTo}
                {...prefetchHandlers(linkTo)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded px-2 py-1 text-xs transition-colors",
                  isSubActive
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:text-foreground",
                )}
                aria-current={isSubActive ? "page" : undefined}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
