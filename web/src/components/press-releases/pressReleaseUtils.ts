import type { PressRelease } from "@/types/models";

export {
  buildDepartmentSideOptions,
  buildMinisterSideOptions,
} from "@/lib/releaseSideFilterUtils";

export type PressReleaseView = "all" | "department" | "minister";

export const PRESS_RELEASE_VIEW_LABELS: Record<PressReleaseView, string> = {
  all: "Calendar",
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
