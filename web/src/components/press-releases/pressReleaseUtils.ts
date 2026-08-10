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

function parsePrNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d+)\s*$/);
  const raw = match ? match[1] : value;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Latest date first; within the same date, highest PR number first. */
export function comparePressReleases(a: PressRelease, b: PressRelease): number {
  const dateCompare = b.pr_date.localeCompare(a.pr_date);
  if (dateCompare !== 0) return dateCompare;

  const aNo = parsePrNumber(a.dipr_pr_no);
  const bNo = parsePrNumber(b.dipr_pr_no);
  if (aNo === null && bNo === null) return a.name.localeCompare(b.name);
  if (aNo === null) return 1;
  if (bNo === null) return -1;
  if (aNo !== bNo) return bNo - aNo;
  return a.name.localeCompare(b.name);
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
  return [...grouped.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayReleases]) => [date, [...dayReleases].sort(comparePressReleases)]);
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
