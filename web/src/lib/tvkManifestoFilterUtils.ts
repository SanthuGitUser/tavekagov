import type { TVKManifestoGroup } from "@/lib/tvkManifestoFeed";

function matchesQuery(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query);
}

export function filterTVKManifestoGroups(
  groups: TVKManifestoGroup[],
  query: string,
): TVKManifestoGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return groups;

  return groups.flatMap((group) => {
    if (matchesQuery(group.title, normalizedQuery)) {
      return [group];
    }

    const children = group.children.flatMap((child) => {
      if (matchesQuery(child.title, normalizedQuery)) {
        return [child];
      }

      const points = child.points.filter((point) =>
        matchesQuery([point.title, point.description ?? ""].join(" "), normalizedQuery),
      );

      if (points.length === 0) return [];
      return [{ ...child, points }];
    });

    if (children.length === 0) return [];
    return [{ ...group, children }];
  });
}

export function countTVKManifestoChildSections(groups: TVKManifestoGroup[]): number {
  return groups.reduce((total, group) => total + group.children.length, 0);
}
