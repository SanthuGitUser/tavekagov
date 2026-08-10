import { Link, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    id: "general",
    label: "General",
    items: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/news", label: "News" },
      { to: "/magazine", label: "Magazine" },
    ],
  },
  {
    id: "official",
    label: "Official",
    items: [
      { to: "/press-releases", label: "Press Releases" },
      { to: "/gov-press-releases", label: "Images" },
    ],
  },
  {
    id: "administrative",
    label: "Administrative",
    items: [
      { to: "/government-orders", label: "Gov Orders" },
      { to: "/transfers-postings", label: "Transfers" },
      { to: "/departments", label: "Departments" },
    ],
  },
  {
    id: "political",
    label: "Political",
    items: [{ to: "/ministers", label: "Ministers" }],
  },
  {
    id: "regional",
    label: "Regional",
    items: [
      { to: "/districts", label: "Districts" },
      { to: "/constituencies", label: "Constituencies" },
    ],
  },
  {
    id: "informational",
    label: "Informational",
    items: [{ to: "/about", label: "About" }],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <Link to="/" className="group min-w-0 shrink-0">
          <div className="text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base">
            TavekaGov
          </div>
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            Tamil Nadu open data
          </p>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main navigation"
        >
          <div className="inline-flex max-w-full shrink-0 items-center gap-0.5 rounded-full bg-muted/80 p-1 shadow-inner">
            {navItems.map((item) => {
              const isActive = isActivePath(location.pathname, item.to);

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 sm:px-3 sm:text-sm",
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
                  )}
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
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
