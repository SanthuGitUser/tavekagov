import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection } from "geojson";

import {
  getConstituencyFeatures,
  type ConstituencyGeoFeature,
} from "@/lib/tamilNaduConstituencyMapFeed";

export const CONSTITUENCY_MAP_PADDING = 6;

export function constituencyPathId(acNumber: number): string {
  return `constituency-${acNumber}`;
}

export function getConstituencyFeatureCollection(
  focusAcNumbers?: Set<number> | null,
): FeatureCollection {
  const allFeatures = getConstituencyFeatures();
  const features =
    focusAcNumbers && focusAcNumbers.size > 0
      ? allFeatures.filter((feature) =>
          focusAcNumbers.has(feature.properties.ac_number),
        )
      : allFeatures;

  return {
    type: "FeatureCollection",
    features,
  } as FeatureCollection;
}

export function buildConstituencyMapProjection(
  containerWidth: number,
  containerHeight: number,
  focusAcNumbers?: Set<number> | null,
) {
  const allCount = getConstituencyFeatures().length;
  const isFocused =
    focusAcNumbers !== null &&
    focusAcNumbers !== undefined &&
    focusAcNumbers.size > 0 &&
    focusAcNumbers.size < allCount;

  const padding = isFocused
    ? focusAcNumbers.size === 1
      ? 18
      : 10
    : CONSTITUENCY_MAP_PADDING;
  const collection = getConstituencyFeatureCollection(
    isFocused ? focusAcNumbers : null,
  );

  const probeProjection = geoMercator().fitWidth(100, collection);
  const probeBounds = geoPath(probeProjection).bounds(collection);
  const geoAspect =
    (probeBounds[1][1] - probeBounds[0][1]) /
    Math.max(1, probeBounds[1][0] - probeBounds[0][0]);

  const boxWidth = Math.max(200, containerWidth);
  const boxHeight = Math.max(160, containerHeight);

  const renderWidth = boxWidth;
  const renderHeight = Math.max(
    Math.ceil(boxWidth * geoAspect),
    Math.floor(boxHeight),
  );

  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [renderWidth - padding, renderHeight - padding],
    ],
    collection,
  );
  const pathGenerator = geoPath(projection);
  const bounds = pathGenerator.bounds(collection);

  const viewBox = {
    x: bounds[0][0] - padding,
    y: bounds[0][1] - padding,
    width: bounds[1][0] - bounds[0][0] + padding * 2,
    height: bounds[1][1] - bounds[0][1] + padding * 2,
  };

  return { pathGenerator, viewBox, renderWidth, renderHeight };
}

export type ProjectedConstituency = {
  feature: ConstituencyGeoFeature;
  acNumber: number;
  path: string;
  centroid: [number, number] | null;
};

export function projectConstituencyFeatures(
  pathGenerator: ReturnType<typeof geoPath>,
): ProjectedConstituency[] {
  return getConstituencyFeatures().map((feature) => {
    const acNumber = feature.properties.ac_number;
    const geoFeature = feature as Feature;
    return {
      feature,
      acNumber,
      path: pathGenerator(geoFeature) ?? "",
      centroid: pathGenerator.centroid(geoFeature) as [number, number],
    };
  });
}
