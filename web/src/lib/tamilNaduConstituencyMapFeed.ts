import constituenciesGeo from "../../../TN-Map/tamil-nadu-constituencies.geojson";

import type { TnConstituency } from "@/types/models";

export type ConstituencyGeoProperties = {
  ac_number: number;
  ac_name: string;
  district: string;
  AC_NO?: number;
  AC_NAME?: string;
  DIST_NAME?: string;
  ST_CODE?: string;
  ST_NAME?: string;
  PC_NO?: number;
  PC_NAME?: string;
};

export type ConstituencyGeoFeature = {
  type: "Feature";
  properties: ConstituencyGeoProperties;
  geometry: {
    type: string;
    coordinates: unknown;
  };
};

export type ConstituencyGeoCollection = {
  type: "FeatureCollection";
  features: ConstituencyGeoFeature[];
};

export const tamilNaduConstituencyMapFeed =
  constituenciesGeo as ConstituencyGeoCollection;

export function getConstituencyFeatures(): ConstituencyGeoFeature[] {
  return tamilNaduConstituencyMapFeed.features;
}

export function buildConstituencyByAcNumber(
  constituencies: TnConstituency[],
): Map<number, TnConstituency> {
  return new Map(constituencies.map((row) => [row.ac_number, row]));
}
