import { normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import type { GovPressRelease, TnDept, TnMinister } from "@/types/models";

type DailyReference = {
  id: number;
  name: string;
};

type DailyResponseFile = {
  date?: string;
  source_url?: string;
  releases?: Record<string, unknown>[];
  ministers?: DailyReference[];
  departments?: DailyReference[];
};

const dailyJsonFiles = import.meta.glob(
  "../../../TN-GOV-Press Release/Response JSON/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].json",
  { eager: true, import: "default" },
) as Record<string, DailyResponseFile>;

const officialDepartmentsById = new Map(
  tamilNaduDepartmentsFeed.departments.map((department) => [department.id, department.name]),
);
const officialMinistersById = new Map(
  tamilNaduMinistersFeed.ministers.map((minister) => [minister.id, minister.name]),
);

function enrichmentScore(release: GovPressRelease): number {
  return (
    (release.title_parsed ? 4 : 0) +
    (release.minister_id != null ? 2 : 0) +
    (release.department_id != null ? 2 : 0) +
    (release.minister_name ? 1 : 0) +
    (release.department_name ? 1 : 0)
  );
}

function preferEnrichedRelease(
  existing: GovPressRelease,
  incoming: GovPressRelease,
): GovPressRelease {
  return enrichmentScore(incoming) >= enrichmentScore(existing) ? incoming : existing;
}

function emptyFlags(): Pick<
  GovPressRelease,
  | "minister_name"
  | "department_name"
  | "minister_id"
  | "department_id"
  | "district_id"
  | "title_parsed"
  | "parse_confidence"
  | "minister_match_confidence"
  | "department_match_confidence"
  | "district_match_confidence"
  | "cm_visits"
  | "postings"
  | "review_meetings"
  | "budget"
  | "tributes"
  | "others"
  | "inspection"
  | "portfolio"
  | "created_at"
  | "updated_at"
> {
  return {
    minister_name: null,
    department_name: null,
    minister_id: null,
    department_id: null,
    district_id: null,
    title_parsed: false,
    parse_confidence: null,
    minister_match_confidence: null,
    department_match_confidence: null,
    district_match_confidence: null,
    cm_visits: false,
    postings: false,
    review_meetings: false,
    budget: false,
    tributes: false,
    others: false,
    inspection: false,
    portfolio: false,
    created_at: "",
    updated_at: "",
  };
}

function parseRelease(raw: Record<string, unknown>): GovPressRelease | null {
  const imageUrl = typeof raw.image_url === "string" ? raw.image_url.trim() : "";
  const releaseDate = normalizeToIsoDate(raw.release_date);
  if (!imageUrl || !releaseDate) return null;

  const flags = emptyFlags();
  const title = typeof raw.title === "string" ? raw.title : null;
  const fileName = typeof raw.file_name === "string" ? raw.file_name : null;

  return {
    id: stableIdFromKey(imageUrl),
    image_url: imageUrl,
    release_date: releaseDate,
    title,
    file_name: fileName,
    minister_name: typeof raw.minister_name === "string" ? raw.minister_name : flags.minister_name,
    department_name:
      typeof raw.department_name === "string" ? raw.department_name : flags.department_name,
    minister_id: typeof raw.minister_id === "number" ? raw.minister_id : flags.minister_id,
    department_id: typeof raw.department_id === "number" ? raw.department_id : flags.department_id,
    district_id: typeof raw.district_id === "number" ? raw.district_id : flags.district_id,
    title_parsed: Boolean(raw.title_parsed),
    parse_confidence:
      typeof raw.parse_confidence === "string" ? raw.parse_confidence : flags.parse_confidence,
    minister_match_confidence:
      typeof raw.minister_match_confidence === "string"
        ? raw.minister_match_confidence
        : flags.minister_match_confidence,
    department_match_confidence:
      typeof raw.department_match_confidence === "string"
        ? raw.department_match_confidence
        : flags.department_match_confidence,
    district_match_confidence:
      typeof raw.district_match_confidence === "string"
        ? raw.district_match_confidence
        : flags.district_match_confidence,
    cm_visits: Boolean(raw.cm_visits),
    postings: Boolean(raw.postings),
    review_meetings: Boolean(raw.review_meetings),
    budget: Boolean(raw.budget),
    tributes: Boolean(raw.tributes),
    others: Boolean(raw.others),
    inspection: Boolean(raw.inspection),
    portfolio: Boolean(raw.portfolio),
    created_at: "",
    updated_at: "",
  };
}

function mergeDailyFiles(): {
  releases: GovPressRelease[];
  ministers: TnMinister[];
  departments: TnDept[];
  sourceUrl: string;
} {
  const releasesByUrl = new Map<string, GovPressRelease>();
  const ministersById = new Map<number, TnMinister>();
  const departmentsById = new Map<number, TnDept>();
  let sourceUrl = "https://www.tn.gov.in/press_release.php";

  const sortedDailyFiles = Object.entries(dailyJsonFiles).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  for (const [, file] of sortedDailyFiles) {
    sourceUrl = file.source_url ?? sourceUrl;

    for (const reference of file.ministers ?? []) {
      if (typeof reference.id !== "number" || typeof reference.name !== "string") continue;
      ministersById.set(reference.id, {
        id: reference.id,
        name: reference.name,
        designation: "",
        portfolio: null,
        photo_url: null,
        display_order: reference.id,
        is_chief_minister: false,
      });
    }

    for (const reference of file.departments ?? []) {
      if (typeof reference.id !== "number" || typeof reference.name !== "string") continue;
      departmentsById.set(reference.id, {
        id: reference.id,
        name: reference.name,
        dep_id_encoded: "",
        minister_name: null,
        display_order: reference.id,
      });
    }

    for (const raw of file.releases ?? []) {
      const parsed = parseRelease(raw);
      if (!parsed) continue;

      const existing = releasesByUrl.get(parsed.image_url);
      releasesByUrl.set(
        parsed.image_url,
        existing ? preferEnrichedRelease(existing, parsed) : parsed,
      );

      if (parsed.minister_id != null) {
        const officialName = officialMinistersById.get(parsed.minister_id);
        const ministerName = officialName ?? parsed.minister_name;
        if (!ministerName) continue;

        const current = ministersById.get(parsed.minister_id);
        ministersById.set(parsed.minister_id, {
          id: parsed.minister_id,
          name: ministerName,
          designation: current?.designation ?? "",
          portfolio: current?.portfolio ?? null,
          photo_url: current?.photo_url ?? null,
          display_order: current?.display_order ?? parsed.minister_id,
          is_chief_minister: current?.is_chief_minister ?? false,
        });
      }

      if (parsed.department_id != null) {
        const officialName = officialDepartmentsById.get(parsed.department_id);
        const departmentName = officialName ?? parsed.department_name;
        if (!departmentName) continue;

        const current = departmentsById.get(parsed.department_id);
        const officialDepartment = tamilNaduDepartmentsFeed.departments.find(
          (department) => department.id === parsed.department_id,
        );
        departmentsById.set(parsed.department_id, {
          id: parsed.department_id,
          name: departmentName,
          dep_id_encoded: officialDepartment?.dep_id_encoded ?? current?.dep_id_encoded ?? "",
          minister_name: officialDepartment?.minister_name ?? current?.minister_name ?? null,
          display_order:
            officialDepartment?.display_order ?? current?.display_order ?? parsed.department_id,
        });
      }
    }
  }

  const releases = [...releasesByUrl.values()].sort((left, right) => {
    const dateDiff = right.release_date.localeCompare(left.release_date);
    if (dateDiff !== 0) return dateDiff;
    return right.id - left.id;
  });

  const ministers = [...ministersById.values()].sort(
    (left, right) => left.display_order - right.display_order || left.name.localeCompare(right.name),
  );
  const departments = [...departmentsById.values()].sort(
    (left, right) => left.display_order - right.display_order || left.name.localeCompare(right.name),
  );

  return { releases, ministers, departments, sourceUrl };
}

function buildFeed() {
  const { releases, ministers, departments, sourceUrl } = mergeDailyFiles();

  return {
    sourceUrl,
    totalResults: releases.length,
    releases,
    ministers,
    departments,
  };
}

export const tamilNaduGovPressReleaseFeed = buildFeed();

export function getGovPressReleases(): GovPressRelease[] {
  return tamilNaduGovPressReleaseFeed.releases;
}

export function getGovPressReleaseMinisters(): TnMinister[] {
  return tamilNaduGovPressReleaseFeed.ministers;
}

export function getGovPressReleaseDepartments(): TnDept[] {
  return tamilNaduGovPressReleaseFeed.departments;
}

export function getGovPressReleasesForDate(date: string): GovPressRelease[] {
  return getGovPressReleases().filter((release) => release.release_date === date);
}
