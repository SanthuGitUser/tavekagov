import tvkManifestoRaw from "../../../TN-TVK-Manifesto/manifests/tvk_manifesto.json";

export type TVKManifestoCategory =
  | "Aram(Virtue)"
  | "Inbam(Joy/Well-Being)"
  | "Porul(Wealth/Economy)";

export type TVKManifestoPoint = {
  number: number | null;
  title: string;
  description: string | null;
};

export type TVKManifestoChildSection = {
  id: string;
  title: string;
  points: TVKManifestoPoint[];
};

export type TVKManifestoGroup = {
  id: string;
  category: TVKManifestoCategory | "Other";
  title: string;
  children: TVKManifestoChildSection[];
};

type RawManifestoRow = {
  section?: {
    category?: unknown;
    title?: unknown;
    number?: unknown;
    subsection?: {
      label?: unknown;
      title?: unknown;
    };
    points?: unknown;
  };
};

type RawManifestoPoint = {
  number?: unknown;
  title?: unknown;
  description?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeCategory(value: unknown): TVKManifestoCategory | null {
  const raw = asTrimmedString(value);
  if (!raw) return null;

  const normalized = raw.replace(/\s+/g, " ").trim().toLowerCase();
  if (normalized.startsWith("aram")) return "Aram(Virtue)";
  if (normalized.startsWith("inbam")) return "Inbam(Joy/Well-Being)";
  if (normalized.startsWith("porul")) return "Porul(Wealth/Economy)";
  return null;
}

function getGroupAndChildTitle(rawSection: RawManifestoRow["section"]): {
  groupTitle: string;
  childTitle: string;
} {
  const title = asTrimmedString(rawSection?.title);
  const subsectionTitle = asTrimmedString(rawSection?.subsection?.title);

  if (title && subsectionTitle) return { groupTitle: title, childTitle: subsectionTitle };
  if (title) return { groupTitle: title, childTitle: title };
  if (subsectionTitle) return { groupTitle: subsectionTitle, childTitle: subsectionTitle };
  return { groupTitle: "Untitled", childTitle: "Untitled" };
}

function normalizePoint(rawPoint: RawManifestoPoint): TVKManifestoPoint | null {
  const number = asNumberOrNull(rawPoint.number);
  const title = asTrimmedString(rawPoint.title);
  const description = asTrimmedString(rawPoint.description);

  const pointTitle = title ?? (number !== null ? `Point ${number}` : null);
  if (!pointTitle && !description) return null;

  return {
    number,
    title: pointTitle ?? "Point",
    description,
  };
}

function asUpperAlphaIndex(value: unknown): number | null {
  const label = asTrimmedString(value);
  if (!label) return null;
  const normalized = label.trim().toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return null;
  return normalized.charCodeAt(0) - "A".charCodeAt(0) + 1;
}

function isDividerSection(rawSection: RawManifestoRow["section"]): boolean {
  const title = asTrimmedString(rawSection?.title) ?? "";
  if (/divider/i.test(title)) return true;

  const rawPoints = Array.isArray(rawSection?.points) ? rawSection.points : [];
  return rawPoints.length === 0;
}

function buildGroups(rows: RawManifestoRow[]): TVKManifestoGroup[] {
  const groupMap = new Map<
    string,
    TVKManifestoGroup & {
      sortSectionNumber: number;
      childMap: Map<
        string,
        TVKManifestoChildSection & {
          pointKeys: Set<string>;
          sortSubsectionLabel: number;
        }
      >;
    }
  >();

  for (const row of rows) {
    const rawSection = row.section;
    if (!rawSection || isDividerSection(rawSection)) continue;

    const category: TVKManifestoGroup["category"] =
      normalizeCategory(rawSection.category) ?? "Other";
    const { groupTitle, childTitle } = getGroupAndChildTitle(rawSection);
    const sectionNumber = asNumberOrNull(rawSection.number) ?? Number.POSITIVE_INFINITY;
    const subsectionLabel = asUpperAlphaIndex(rawSection.subsection?.label) ?? Number.POSITIVE_INFINITY;

    const groupId = `${category}||${groupTitle}`;
    const childId = `${groupId}||${childTitle}`;

    const group =
      groupMap.get(groupId) ??
      ({
        id: groupId,
        category,
        title: groupTitle,
        children: [],
        sortSectionNumber: sectionNumber,
        childMap: new Map(),
      } satisfies TVKManifestoGroup & {
        sortSectionNumber: number;
        childMap: Map<string, TVKManifestoChildSection & { pointKeys: Set<string>; sortSubsectionLabel: number }>;
      });

    group.sortSectionNumber = Math.min(group.sortSectionNumber, sectionNumber);

    const child =
      group.childMap.get(childId) ??
      ({
        id: childId,
        title: childTitle,
        points: [],
        pointKeys: new Set<string>(),
        sortSubsectionLabel: subsectionLabel,
      } satisfies TVKManifestoChildSection & {
        pointKeys: Set<string>;
        sortSubsectionLabel: number;
      });

    child.sortSubsectionLabel = Math.min(child.sortSubsectionLabel, subsectionLabel);

    const rawPoints = Array.isArray(rawSection.points)
      ? (rawSection.points as RawManifestoPoint[])
      : [];

    for (const rawPoint of rawPoints) {
      const point = normalizePoint(rawPoint);
      if (!point) continue;

      const pointKey = `${point.number ?? ""}||${point.title}`;
      if (child.pointKeys.has(pointKey)) continue;
      child.pointKeys.add(pointKey);
      child.points.push(point);
    }

    group.childMap.set(childId, child);
    groupMap.set(groupId, group);
  }

  const categoryOrder = [
    "Aram(Virtue)",
    "Inbam(Joy/Well-Being)",
    "Porul(Wealth/Economy)",
    "Other",
  ] as const;

  return [...groupMap.values()]
    .map(({ childMap, sortSectionNumber, ...group }) => {
      const children = [...childMap.values()]
        .map(({ pointKeys: _pointKeys, sortSubsectionLabel: _sortSubsectionLabel, ...child }) => ({
          ...child,
          points: [...child.points].sort((left, right) => {
            const leftNumber = left.number ?? Number.POSITIVE_INFINITY;
            const rightNumber = right.number ?? Number.POSITIVE_INFINITY;
            if (leftNumber !== rightNumber) return leftNumber - rightNumber;
            return left.title.localeCompare(right.title);
          }),
        }))
        .filter((child) => child.points.length > 0)
        .sort((left, right) => left.title.localeCompare(right.title));

      if (children.length === 0) return null;

      return {
        ...group,
        children,
        _sortSectionNumber: sortSectionNumber,
      };
    })
    .filter((group): group is NonNullable<typeof group> => group !== null)
    .sort((left, right) => {
      const leftIndex = categoryOrder.indexOf(left.category);
      const rightIndex = categoryOrder.indexOf(right.category);
      const categoryCompare = leftIndex - rightIndex;
      if (categoryCompare !== 0) return categoryCompare;

      const sectionCompare = left._sortSectionNumber - right._sortSectionNumber;
      if (sectionCompare !== 0) return sectionCompare;

      return left.title.localeCompare(right.title);
    })
    .map(({ _sortSectionNumber: _ignored, ...group }) => group);
}

const rows = (tvkManifestoRaw as unknown as RawManifestoRow[]) ?? [];
const groups = buildGroups(rows);
const childSections = groups.flatMap((group) => group.children);
const allCategories: TVKManifestoCategory[] = [
  "Aram(Virtue)",
  "Inbam(Joy/Well-Being)",
  "Porul(Wealth/Economy)",
];
const categories = allCategories.filter((category) =>
  groups.some((group) => group.category === category),
);

export const tvkManifestoFeed = {
  totalRows: rows.length,
  groupCount: groups.length,
  sectionCount: childSections.length,
  categories,
  groups,
};

export function getTVKManifestoCategories(): string[] {
  return tvkManifestoFeed.categories;
}

export function getTVKManifestoGroups(category?: string | null): TVKManifestoGroup[] {
  if (!category || category === "all") return tvkManifestoFeed.groups;
  return tvkManifestoFeed.groups.filter((group) => group.category === category);
}

