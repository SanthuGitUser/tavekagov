import districtNameAliases from "../../../TN-Map/district-name-aliases.json";
import districtsGeo from "../../../TN-Map/tamil-nadu-districts.geojson";

export type DistrictGeoProperties = {
  district: string;
  st_code?: string;
  dt_code?: string;
  year?: string;
  st_nm?: string;
};

export type DistrictGeoGeometry = {
  type: string;
  coordinates: unknown;
};

export type DistrictGeoFeature = {
  type: "Feature";
  properties: DistrictGeoProperties;
  geometry: DistrictGeoGeometry;
};

export type DistrictGeoCollection = {
  type: "FeatureCollection";
  features: DistrictGeoFeature[];
};

const aliases = districtNameAliases as Record<string, string>;

export const tamilNaduMapFeed = districtsGeo as DistrictGeoCollection;

/** GeoJSON `properties.district` → tn.gov.in manifest name */
export function geoDistrictNameToManifest(geoName: string): string {
  return aliases[geoName] ?? geoName;
}

/** tn.gov.in manifest name → GeoJSON `properties.district`, if mapped */
export function manifestNameToGeoDistrict(manifestName: string): string | null {
  for (const [geoName, mappedName] of Object.entries(aliases)) {
    if (mappedName === manifestName) return geoName;
  }

  const direct = tamilNaduMapFeed.features.find(
    (feature) =>
      feature.properties.district.localeCompare(manifestName, undefined, {
        sensitivity: "accent",
      }) === 0,
  );
  return direct?.properties.district ?? null;
}

export function getDistrictFeatures(): DistrictGeoFeature[] {
  return tamilNaduMapFeed.features;
}

export function getMappedDistrictNames(): Set<string> {
  return new Set(
    tamilNaduMapFeed.features.map((feature) =>
      geoDistrictNameToManifest(feature.properties.district),
    ),
  );
}
