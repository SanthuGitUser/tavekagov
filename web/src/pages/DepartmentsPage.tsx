import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useDepartmentSearch } from "@/context/DepartmentSearchContext";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
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
    <div>
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No departments match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((dept) => {
            const minister = resolveMinister(dept.minister_name, ministersByKey);
            const photoUrl = minister?.photo_url ?? null;
            const displayMinisterName = minister?.name ?? dept.minister_name;
            const designation = minister?.designation ?? null;

            return (
              <Card key={String(dept.id)}>
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

                  <div className="min-w-0 space-y-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                      {dept.name}
                    </h3>
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
                    <p className="text-xs text-muted-foreground">{dept.dep_id_encoded}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
