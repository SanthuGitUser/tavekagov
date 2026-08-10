import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Moon, Sun } from "lucide-react";

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
      { to: "/press-releases", label: "Press" },
      { to: "/gov-press-releases", label: "Press Releases Images" },
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

function findGroupForPath(pathname: string): NavGroup {
  return (
    navGroups.find((group) =>
      group.items.some(
        (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
      ),
    ) ?? navGroups[0]
  );
}

function findItemForPath(group: NavGroup, pathname: string): NavItem {
  return (
    group.items.find(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
    ) ?? group.items[0]
  );
}

type NavPageDropdownProps = {
  group: NavGroup;
  pathname: string;
};

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

function NavPageDropdown({ group, pathname }: NavPageDropdownProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const selectedItem = findItemForPath(group, pathname);

  function updateMenuPosition() {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 6,
      left: rect.left,
      minWidth: Math.max(rect.width, 176),
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }
    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleReposition() {
      updateMenuPosition();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  function selectPage(item: NavItem) {
    navigate(item.to);
    setOpen(false);
  }

  const menu =
    open && menuPosition
      ? createPortal(
          <ul
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={`${group.label} pages`}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              minWidth: menuPosition.minWidth,
            }}
            className="fixed z-[100] max-h-64 overflow-y-auto rounded-lg border border-border bg-card p-1 text-foreground shadow-lg"
          >
            {group.items.map((item) => {
              const isSelected = item.to === selectedItem.to;
              return (
                <li key={item.to} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => selectPage(item)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent",
                      isSelected && "bg-accent/60 font-medium",
                    )}
                  >
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-full px-2 py-1.5 text-[11px] font-medium text-foreground transition-colors appearance-none hover:bg-muted/50 sm:px-2.5 sm:text-sm",
          open && "bg-muted/40",
        )}
      >
        <span className="max-w-[8rem] truncate sm:max-w-[10rem]">{selectedItem.label}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {menu}
    </div>
  );
}

export function TopNav() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeGroupId, setActiveGroupId] = useState(() =>
    findGroupForPath(location.pathname).id,
  );

  useEffect(() => {
    setActiveGroupId(findGroupForPath(location.pathname).id);
  }, [location.pathname]);

  function selectGroup(group: NavGroup) {
    setActiveGroupId(group.id);
    const isCurrentGroup = group.items.some(
      (item) =>
        location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    );
    if (!isCurrentGroup) {
      navigate(group.items[0].to);
    }
  }

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
          aria-label="Main navigation groups"
        >
          <div className="inline-flex max-w-full shrink-0 items-center gap-0.5 rounded-full bg-muted/80 p-1 shadow-inner">
            {navGroups.map((group) => {
              const isActive = group.id === activeGroupId;
              const hasMultiplePages = group.items.length > 1;

              if (isActive && hasMultiplePages) {
                return (
                  <div
                    key={group.id}
                    className="flex shrink-0 items-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border/60"
                  >
                    <span className="px-2.5 py-1.5 text-[11px] font-medium sm:px-3 sm:text-sm">
                      {group.label}
                    </span>
                    <span className="h-4 w-px shrink-0 bg-border/80" aria-hidden />
                    <NavPageDropdown group={group} pathname={location.pathname} />
                  </div>
                );
              }

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => selectGroup(group)}
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 sm:px-3.5 sm:text-sm",
                    isActive
                      ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                      : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
                  )}
                >
                  {group.label}
                </button>
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
