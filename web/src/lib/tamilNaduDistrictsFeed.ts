import type { TnDistrict } from "@/types/models";

import districtsManifest from "../../../TN-GOV_Districts/manifests/tn_districts.json";

type DistrictsManifest = {
  source_url?: string;
  fetchedAt?: string;
  count?: number;
  districts: TnDistrict[];
};

const manifest = districtsManifest as DistrictsManifest;

export const tamilNaduDistrictsFeed = {
  sourceUrl: manifest.source_url ?? "https://www.tn.gov.in/district_list.php",
  fetchedAt: manifest.fetchedAt ?? "",
  totalResults: manifest.count ?? manifest.districts.length,
  districts: [...manifest.districts].sort(
    (left, right) => left.display_order - right.display_order,
  ),
};

export function getDistrictsById(): Map<number, TnDistrict> {
  return new Map(tamilNaduDistrictsFeed.districts.map((district) => [district.id, district]));
}
