import type { LightboxImage } from "@/components/shared/ImageLightbox";
import {
  buildDepartmentSideOptions,
  buildMinisterSideOptions,
} from "@/lib/releaseSideFilterUtils";
import type { GovPressRelease } from "@/types/models";

export type GovPressReleaseView = "all" | "department" | "minister";

export const GOV_PRESS_RELEASE_VIEW_LABELS: Record<GovPressReleaseView, string> = {
  all: "Calendar",
  department: "Department",
  minister: "Minister",
};

export type GovPressReleaseFlagFilter =
  | "date"
  | "all"
  | "portfolio"
  | "cm_visits"
  | "review_meetings"
  | "budget"
  | "inspection"
  | "tributes"
  | "others"
  | "postings";

export const FLAG_FILTER_LABELS: Record<GovPressReleaseFlagFilter, string> = {
  date: "Date",
  all: "All releases",
  portfolio: "Portfolio",
  cm_visits: "CM Visits",
  review_meetings: "Review Meetings",
  budget: "Budget",
  inspection: "Inspection",
  tributes: "Tributes",
  others: "Others",
  postings: "Postings",
};

export const ALL_VIEW_SIDE_FILTER_ORDER: GovPressReleaseFlagFilter[] = ["date"];

export const CATEGORY_SIDE_FILTER_ORDER: GovPressReleaseFlagFilter[] = [
  "all",
  "portfolio",
  "cm_visits",
  "review_meetings",
  "budget",
  "inspection",
  "tributes",
  "postings",
  "others",
];

export function getFlagFilterLabel(filter: GovPressReleaseFlagFilter): string {
  return FLAG_FILTER_LABELS[filter];
}

export function formatReleaseCount(count: number): string {
  return `${count} release${count === 1 ? "" : "s"}`;
}

export function groupReleasesByDate(
  releases: (GovPressRelease & { release_date: string })[],
): [string, GovPressRelease[]][] {
  const grouped = new Map<string, GovPressRelease[]>();
  for (const release of releases) {
    const existing = grouped.get(release.release_date);
    if (existing) {
      existing.push(release);
    } else {
      grouped.set(release.release_date, [release]);
    }
  }
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function getReleaseName(release: GovPressRelease): string {
  return release.title ?? release.file_name ?? `Release #${release.id}`;
}

export function compareReleases(a: GovPressRelease, b: GovPressRelease): number {
  const nameCompare = getReleaseName(a).localeCompare(getReleaseName(b));
  if (nameCompare !== 0) return nameCompare;
  return a.id - b.id;
}

export function toLightboxImage(release: GovPressRelease): LightboxImage {
  return {
    id: release.id,
    image_url: release.image_url,
    title: release.title,
    subtitle: release.title,
    file_name: release.file_name,
  };
}

export function matchesSearch(release: GovPressRelease, query: string): boolean {
  if (!query) return true;
  const haystack = [
    release.title,
    release.file_name,
    release.release_date,
    release.minister_name,
    release.department_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function matchesFlagFilter(
  release: GovPressRelease,
  filter: GovPressReleaseFlagFilter,
): boolean {
  if (filter === "date" || filter === "all") return true;
  if (filter === "portfolio") return release.portfolio;
  if (filter === "cm_visits") return release.cm_visits;
  if (filter === "review_meetings") return release.review_meetings;
  if (filter === "budget") return release.budget;
  if (filter === "inspection") return release.inspection;
  if (filter === "tributes") return release.tributes;
  if (filter === "others") return release.others;
  return release.postings;
}

export function isBrowseModeFilter(filter: GovPressReleaseFlagFilter): boolean {
  return filter === "date" || filter === "all";
}

export function buildCategorySideOptions(releases: GovPressRelease[]): {
  id: string;
  label: string;
  count: number;
}[] {
  return CATEGORY_SIDE_FILTER_ORDER.map((filter) => ({
    id: filter,
    label: getFlagFilterLabel(filter),
    count:
      filter === "all"
        ? releases.length
        : releases.filter((release) => matchesFlagFilter(release, filter)).length,
  })).filter((option) => option.count > 0);
}

export { buildDepartmentSideOptions, buildMinisterSideOptions };
