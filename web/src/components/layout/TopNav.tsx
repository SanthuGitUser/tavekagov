import { NavLink, Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/news", label: "News" },
  { to: "/press-releases", label: "Press" },
  { to: "/gov-press-releases", label: "Press Releases Images" },
  { to: "/government-orders", label: "Gov Orders" },
  { to: "/transfers-postings", label: "Transfers" },
  { to: "/departments", label: "Departments" },
  { to: "/ministers", label: "Ministers" },
  { to: "/districts", label: "Districts" },
  { to: "/magazine", label: "Magazine" },
  { to: "/about", label: "About" },
];

export function TopNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <Link to="/" className="shrink-0 min-w-0">
          <div className="text-sm font-bold tracking-tight text-primary sm:text-base">
            TavekaGov
          </div>
          <p className="hidden text-[10px] text-muted-foreground sm:block">
            Tamil Nadu open data
          </p>
        </Link>

        <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-0.5 sm:justify-center sm:gap-1 lg:justify-start">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "shrink-0 rounded-md border px-1.5 py-1 text-[10px] font-medium transition-colors sm:px-2 sm:py-1.5 sm:text-[11px]",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}
          >
            {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </Button>
          <Badge variant="success" className="hidden text-[10px] sm:inline-flex">
            Open data
          </Badge>
        </div>
      </div>
    </header>
  );
}
