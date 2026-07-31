import type { PressRelease } from "@/types/models";

export type PressReleaseView = "all" | "department" | "minister";

export const PRESS_RELEASE_VIEW_LABELS: Record<PressReleaseView, string> = {
  all: "All",
  department: "Department",
  minister: "Minister",
};

export function formatReleaseCount(count: number): string {
  return `${count} release${count === 1 ? "" : "s"}`;
}

export function groupReleasesByDate(
  releases: PressRelease[],
): [string, PressRelease[]][] {
  const grouped = new Map<string, PressRelease[]>();
  for (const release of releases) {
    const existing = grouped.get(release.pr_date);
    if (existing) {
      existing.push(release);
    } else {
      grouped.set(release.pr_date, [release]);
    }
  }
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function matchesSearch(release: PressRelease, query: string): boolean {
  if (!query) return true;
  const haystack = [
    release.name,
    release.topic,
    release.department_name,
    release.release_type,
    release.dipr_pr_no,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function buildDepartmentSideOptions(
  releases: PressRelease[],
  departments: { id: number; name: string }[],
): { id: string; label: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const release of releases) {
    if (release.department_id == null) continue;
    counts.set(release.department_id, (counts.get(release.department_id) ?? 0) + 1);
  }

  const deptNames = new Map(departments.map((dept) => [dept.id, dept.name]));

  return [...counts.entries()]
    .map(([id, count]) => ({
      id: String(id),
      label:
        deptNames.get(id) ??
        releases.find((r) => r.department_id === id)?.department_name ??
        `Department #${id}`,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildMinisterSideOptions(
  releases: PressRelease[],
  ministers: { id: number; name: string }[],
): { id: string; label: string; count: number }[] {
  const counts = new Map<number, number>();
  for (const release of releases) {
    if (release.minister_id == null) continue;
    counts.set(release.minister_id, (counts.get(release.minister_id) ?? 0) + 1);
  }

  const ministerNames = new Map(ministers.map((minister) => [minister.id, minister.name]));

  return [...counts.entries()]
    .map(([id, count]) => ({
      id: String(id),
      label:
        ministerNames.get(id) ??
        `Minister #${id}`,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
