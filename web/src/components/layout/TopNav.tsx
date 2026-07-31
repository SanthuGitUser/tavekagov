import { NavLink } from "react-router-dom";
import {
  ArrowRightLeft,
  Building2,
  BookOpen,
  FileImage,
  FileText,
  Gavel,
  LayoutDashboard,
  MapPin,
  Moon,
  Newspaper,
  Sun,
  Users,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/press-releases", label: "Press Releases", icon: FileText },
  { to: "/gov-press-releases", label: "PR Images", icon: FileImage },
  { to: "/government-orders", label: "Government Orders", icon: Gavel },
  { to: "/transfers-postings", label: "Transfers and Postings", icon: ArrowRightLeft },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/ministers", label: "Ministers", icon: Users },
  { to: "/districts", label: "Districts", icon: MapPin },
  { to: "/magazine", label: "Magazine", icon: BookOpen },
  { to: "/about", label: "About", icon: Info },
];

export function TopNav() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <div className="text-lg font-bold tracking-tight text-primary">TavekaGov</div>
          <p className="text-xs text-muted-foreground">
            Tamil Nadu open data portal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Dark mode" : "Light mode"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Badge variant="success">Open data</Badge>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-4 py-2 sm:px-6">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
