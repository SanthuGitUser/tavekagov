import { useMemo } from "react";

import { DepartmentTile } from "@/components/government/DepartmentTile";
import { MinisterDetailPanel } from "@/components/government/MinisterDetailPanel";
import { Card, CardContent } from "@/components/ui/card";
import { useGovernmentSearch } from "@/context/GovernmentSearchContext";
import {
  buildMinisterDepartmentGroups,
  filterMinisterDepartmentGroups,
} from "@/lib/governmentGroupUtils";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";

export function MinistersPage() {
  const governmentSearch = useGovernmentSearch();
  const search = governmentSearch?.search ?? "";

  const groups = useMemo(
    () =>
      buildMinisterDepartmentGroups(
        tamilNaduMinistersFeed.ministers,
        tamilNaduDepartmentsFeed.departments,
      ),
    [],
  );

  const filteredGroups = useMemo(
    () => filterMinisterDepartmentGroups(groups, search),
    [groups, search],
  );

  const unassignedDepartments = useMemo(() => {
    const assignedIds = new Set<number>();
    for (const group of groups) {
      for (const dept of group.departments) assignedIds.add(dept.id);
    }
    return tamilNaduDepartmentsFeed.departments.filter((dept) => !assignedIds.has(dept.id));
  }, [groups]);

  const filteredUnassignedDepartments = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) return unassignedDepartments;

    return unassignedDepartments.filter((department) => {
      const haystack = [
        department.name,
        department.minister_name ?? "",
        department.dep_id_encoded,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [search, unassignedDepartments]);

  const visibleUnassignedCount = filteredUnassignedDepartments.length;

  if (filteredGroups.length === 0 && visibleUnassignedCount === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No ministers match your search.
        </CardContent>
      </Card>
    );
  }

  if (filteredGroups.length === 0 && visibleUnassignedCount > 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-base font-semibold">Departments</h2>
              <p className="text-sm text-muted-foreground">
                These departments are present in the directory but aren&apos;t currently mapped to a
                minister.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredUnassignedDepartments.map((department) => (
                <DepartmentTile key={department.id} department={department} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredGroups.map((group) => (
            <MinisterDetailPanel key={group.minister.id} group={group} />
          ))}
        </div>

        {visibleUnassignedCount > 0 ? (
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold">Unassigned departments</h3>
                  <p className="text-sm text-muted-foreground">
                    Departments present in the directory but not mapped to a minister.
                  </p>
                </div>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {visibleUnassignedCount} department{visibleUnassignedCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredUnassignedDepartments.map((department) => (
                  <DepartmentTile key={department.id} department={department} />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
