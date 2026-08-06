import mapManifest from "../../../TN-Map/manifest.json";

export const tamilNaduMapMeta = {
  sourceUrl: mapManifest.source_url,
  fetchedAt: mapManifest.fetchedAt,
  featureCount: mapManifest.feature_count,
  missingDistricts: mapManifest.missing_districts as string[],
};
