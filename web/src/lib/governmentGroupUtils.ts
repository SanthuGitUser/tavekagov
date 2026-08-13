import type { TnDept, TnMinister } from "@/types/models";

import { buildMinistersByKey } from "@/lib/tamilNaduMinistersFeed";

export type MinisterDepartmentGroup = {
  minister: TnMinister;
  departments: TnDept[];
};

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveMinisterForDepartment(
  ministerName: string | null | undefined,
  ministersByKey: Record<string, TnMinister>,
): TnMinister | null {
  if (!ministerName) return null;
  const exact = ministersByKey[normalizeKey(ministerName)];
  if (exact) return exact;

  const target = normalizeKey(ministerName);
  const keys = Object.keys(ministersByKey);
  const partial = keys.find((key) => key.includes(target) || target.includes(key));
  return partial ? ministersByKey[partial] : null;
}

export function buildMinisterDepartmentGroups(
  ministers: TnMinister[],
  departments: TnDept[],
): MinisterDepartmentGroup[] {
  const ministersByKey = buildMinistersByKey(ministers);
  const departmentsByMinisterId = new Map<number, TnDept[]>();

  for (const department of departments) {
    const minister = resolveMinisterForDepartment(department.minister_name, ministersByKey);
    if (!minister) continue;

    const existing = departmentsByMinisterId.get(minister.id) ?? [];
    existing.push(department);
    departmentsByMinisterId.set(minister.id, existing);
  }

  return ministers.map((minister) => ({
    minister,
    departments: [...(departmentsByMinisterId.get(minister.id) ?? [])].sort(
      (left, right) => left.display_order - right.display_order,
    ),
  }));
}

function stripHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

function normalizePortfolios(portfolios: string[]): string {
  return portfolios.map((value) => stripHtml(value)).filter(Boolean).join(" ");
}

export function filterMinisterDepartmentGroups(
  groups: MinisterDepartmentGroup[],
  query: string,
): MinisterDepartmentGroup[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return groups;

  return groups.flatMap((group) => {
    const ministerHaystack = [
      group.minister.name,
      group.minister.designation,
      group.minister.portfolios.length > 0 ? normalizePortfolios(group.minister.portfolios) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (ministerHaystack.includes(normalizedQuery)) {
      return [group];
    }

    const matchingDepartments = group.departments.filter((department) => {
      const departmentHaystack = [
        department.name,
        department.minister_name,
        department.dep_id_encoded,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return departmentHaystack.includes(normalizedQuery);
    });

    if (matchingDepartments.length === 0) {
      return [];
    }

    return [{ minister: group.minister, departments: matchingDepartments }];
  });
}
