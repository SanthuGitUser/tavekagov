import type { TnDept } from "@/types/models";

import departmentsManifest from "../../../TN-GOV_Departments/manifests/tn_departments.json";

type DepartmentsManifest = {
  source_url?: string;
  count?: number;
  departments: TnDept[];
};

const manifest = departmentsManifest as DepartmentsManifest;

export const tamilNaduDepartmentsFeed = {
  sourceUrl: manifest.source_url ?? "https://www.tn.gov.in/department_list.php",
  totalResults: manifest.count ?? manifest.departments.length,
  departments: [...manifest.departments].sort(
    (left, right) => left.display_order - right.display_order,
  ),
};

export function getDepartmentsById(): Map<number, TnDept> {
  return new Map(tamilNaduDepartmentsFeed.departments.map((dept) => [dept.id, dept]));
}

export function getDepartmentsByEncoded(): Record<string, TnDept> {
  return Object.fromEntries(
    tamilNaduDepartmentsFeed.departments.map((dept) => [dept.dep_id_encoded, dept]),
  );
}
