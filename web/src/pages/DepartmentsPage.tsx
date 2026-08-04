import { useMemo } from "react";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDepartmentSearch } from "@/context/DepartmentSearchContext";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { cn } from "@/lib/utils";
import type { TnMinister } from "@/types/models";

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function buildMinistersByKey(ministers: TnMinister[]): Record<string, TnMinister> {
  return Object.fromEntries(ministers.map((minister) => [normalizeKey(minister.name), minister]));
}

function resolveMinister(
  ministerName: string | null | undefined,
  ministersByKey: Record<string, TnMinister>,
): TnMinister | null {
  if (!ministerName) return null;
  const exact = ministersByKey[normalizeKey(ministerName)];
  if (exact) return exact;

  const target = normalizeKey(ministerName);
  const keys = Object.keys(ministersByKey);
  const partial = keys.find((key) => key.includes(target) || target.includes(key));
  return partial ? ministersByKey[partial] : null;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function DepartmentsPage() {
  const departmentSearch = useDepartmentSearch();
  const search = departmentSearch?.search ?? "";

  const departments = useMemo(() => tamilNaduDepartmentsFeed.departments, []);
  const ministersByKey = useMemo(
    () => buildMinistersByKey(tamilNaduMinistersFeed.ministers),
    [],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((dept) => {
      const name = String(dept.name ?? "").toLowerCase();
      const ministerName = String(dept.minister_name ?? "").toLowerCase();
      const depId = String(dept.dep_id_encoded ?? "").toLowerCase();
      return (
        name.includes(query) || ministerName.includes(query) || depId.includes(query)
      );
    });
  }, [departments, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No departments match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((dept) => {
              const minister = resolveMinister(dept.minister_name, ministersByKey);
              const photoUrl = minister?.photo_url ?? null;
              const displayMinisterName = minister?.name ?? dept.minister_name;
              const designation = minister?.designation ?? null;

              return (
                <Card
                  key={String(dept.id)}
                  className={cn(
                    "group transition-colors",
                    "cursor-pointer hover:border-primary/25 hover:bg-accent/20",
                    "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                  )}
                >
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={displayMinisterName ?? "Minister"}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : displayMinisterName ? (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                          {getInitials(displayMinisterName)}
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                          {String(dept.name ?? "?").charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                          {dept.name}
                        </h3>
                        {dept.profile_url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                            asChild
                          >
                            <a
                              href={dept.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${dept.name} official page`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                      </div>
                      {displayMinisterName ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {displayMinisterName}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                      {designation ? (
                        <p className="truncate text-xs text-muted-foreground">{designation}</p>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
