type ReleaseWithDepartment = {
  department_id: number | null;
};

type ReleaseWithMinister = {
  minister_id: number | null;
};

export type ReleaseSideFilterOption = {
  id: string;
  label: string;
  count: number;
};

export function buildDepartmentSideOptions(
  releases: ReleaseWithDepartment[],
  departments: { id: number; name: string }[],
): ReleaseSideFilterOption[] {
  const counts = new Map<number, number>();

  for (const release of releases) {
    if (release.department_id == null) continue;
    counts.set(release.department_id, (counts.get(release.department_id) ?? 0) + 1);
  }

  const deptNames = new Map(departments.map((dept) => [dept.id, dept.name]));

  return [...counts.entries()]
    .map(([id, count]) => ({
      id: String(id),
      label: deptNames.get(id) ?? `Department #${id}`,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildMinisterSideOptions(
  releases: ReleaseWithMinister[],
  ministers: { id: number; name: string }[],
): ReleaseSideFilterOption[] {
  const counts = new Map<number, number>();

  for (const release of releases) {
    if (release.minister_id == null) continue;
    counts.set(release.minister_id, (counts.get(release.minister_id) ?? 0) + 1);
  }

  const ministerNames = new Map(ministers.map((minister) => [minister.id, minister.name]));

  return [...counts.entries()]
    .map(([id, count]) => ({
      id: String(id),
      label: ministerNames.get(id) ?? `Minister #${id}`,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
