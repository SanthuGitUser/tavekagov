import { useMemo } from "react";

import { DepartmentTile } from "@/components/government/DepartmentTile";
import { Card, CardContent } from "@/components/ui/card";
import { useGovernmentSearch } from "@/context/GovernmentSearchContext";
import { resolveMinisterForDepartment } from "@/lib/governmentGroupUtils";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { buildMinistersByKey, tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";

export function DepartmentsPage() {
  const governmentSearch = useGovernmentSearch();
  const search = governmentSearch?.search ?? "";

  const ministersByKey = useMemo(() => buildMinistersByKey(tamilNaduMinistersFeed.ministers), []);

  const filteredDepartments = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    if (!normalizedQuery) return tamilNaduDepartmentsFeed.departments;
    return tamilNaduDepartmentsFeed.departments.filter((department) => {
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
  }, [search]);

  if (filteredDepartments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No departments match your search.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map((department) => (
              <DepartmentTile
                key={department.id}
                department={department}
                showMinister
                minister={resolveMinisterForDepartment(department.minister_name, ministersByKey)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
