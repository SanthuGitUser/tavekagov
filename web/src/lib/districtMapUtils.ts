import { geoMercator, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";

import {
  geoDistrictNameToManifest,
  getDistrictFeatures,
} from "@/lib/tamilNaduMapFeed";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import type { TnDistrict } from "@/types/models";

export type MapVariant = "default" | "featured";

export type MapViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const MAP_PADDING = 4;

export function getDistrictDetail(name: string): TnDistrict | undefined {
  return tamilNaduDistrictsFeed.districts.find((district) => district.name === name);
}

export function manifestNameFromGeoProperty(geoDistrict: string): string {
  return geoDistrictNameToManifest(geoDistrict);
}

export function getTamilNaduFeatureCollection(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: getDistrictFeatures(),
  } as FeatureCollection;
}

/** Vertical space taken by nav, page padding, and card padding (featured home). */
export const MAP_VIEWPORT_CHROME = 76;

export function getAvailableMapSpace(variant: MapVariant) {
  if (typeof window === "undefined") {
    return { maxWidth: 640, maxHeight: 420 };
  }

  const maxHeight =
    variant === "featured" && typeof window !== "undefined"
      ? Math.max(260, Math.floor((window.innerHeight - MAP_VIEWPORT_CHROME) * 0.82))
      : typeof window !== "undefined"
        ? Math.max(220, Math.floor(window.innerHeight - MAP_VIEWPORT_CHROME - 48))
        : Number.POSITIVE_INFINITY;
  const maxWidth =
    variant === "featured"
      ? Math.floor(window.innerWidth * 0.54)
      : Math.max(280, window.innerWidth - 32);

  return { maxWidth, maxHeight };
}

/** Fit Tamil Nadu tightly with minimal padding; featured home sizes to viewport (no scroll). */
export function buildMapProjection(
  containerWidth: number,
  variant: MapVariant,
  containerHeight?: number,
) {
  const padding = MAP_PADDING;
  const collection = getTamilNaduFeatureCollection();
  const { maxWidth, maxHeight } = getAvailableMapSpace(variant);

  const probeProjection = geoMercator().fitWidth(100, collection);
  const probeBounds = geoPath(probeProjection).bounds(collection);
  const geoAspect =
    (probeBounds[1][1] - probeBounds[0][1]) /
    Math.max(1, probeBounds[1][0] - probeBounds[0][0]);

  let renderWidth: number;
  let renderHeight: number;

  if (variant === "featured") {
    renderHeight = maxHeight;
    renderWidth = Math.ceil(renderHeight / geoAspect);
    if (renderWidth > maxWidth) {
      renderWidth = maxWidth;
      renderHeight = Math.ceil(renderWidth * geoAspect);
    }
  } else {
    const boxWidth = Math.max(200, Math.min(containerWidth, maxWidth));
    let boxHeight = maxHeight;
    if (containerHeight && containerHeight > 0) {
      boxHeight = Math.min(boxHeight, containerHeight);
    }

    // Project at full container width; the SVG fills the map area via slice scaling.
    renderWidth = boxWidth;
    renderHeight = Math.max(
      Math.ceil(boxWidth * geoAspect),
      Math.max(160, Math.floor(boxHeight)),
    );
  }

  const projection = geoMercator().fitExtent(
    [
      [padding, padding],
      [renderWidth - padding, renderHeight - padding],
    ],
    collection,
  );
  const pathGenerator = geoPath(projection);
  const bounds = pathGenerator.bounds(collection);

  const viewBox: MapViewBox = {
    x: bounds[0][0] - padding,
    y: bounds[0][1] - padding,
    width: bounds[1][0] - bounds[0][0] + padding * 2,
    height: bounds[1][1] - bounds[0][1] + padding * 2,
  };

  return { pathGenerator, viewBox, renderWidth, renderHeight };
}

export type LabelLayout = {
  fontSize: number;
  useTextPath: boolean;
  labelPath: string;
};

/** Size label to district bounds; curve along the longer axis when the name is tight. */
export function computeDistrictLabelLayout(
  name: string,
  area: number,
  bbox: [[number, number], [number, number]],
  centroid: [number, number],
): LabelLayout {
  const [[x0, y0], [x1, y1]] = bbox;
  const bboxWidth = Math.max(1, x1 - x0);
  const bboxHeight = Math.max(1, y1 - y0);
  const horizontal = bboxWidth >= bboxHeight;
  const fitSpan = horizontal ? bboxWidth : bboxHeight;
  const charFactor = 0.54;

  let fontSize = Math.sqrt(Math.max(area, 1)) / 8.5;
  fontSize = Math.max(5.5, Math.min(13, fontSize));

  const neededSpan = name.length * fontSize * charFactor;
  if (neededSpan > fitSpan * 0.9) {
    fontSize = Math.max(5, (fitSpan * 0.88) / (name.length * charFactor));
  }

  const cx = centroid[0];
  const cy = centroid[1];
  const useTextPath = name.length * fontSize * charFactor > fitSpan * 0.82;

  if (useTextPath) {
    if (horizontal) {
      const margin = bboxWidth * 0.08;
      const left = x0 + margin;
      const right = x1 - margin;
      const curve = Math.min(bboxHeight * 0.14, fontSize * 1.2);
      return {
        fontSize,
        useTextPath: true,
        labelPath: `M ${left} ${cy} Q ${cx} ${cy - curve} ${right} ${cy}`,
      };
    }

    const margin = bboxHeight * 0.1;
    const top = y0 + margin;
    const bottom = y1 - margin;
    const curve = Math.min(bboxWidth * 0.12, fontSize * 1.2);
    return {
      fontSize,
      useTextPath: true,
      labelPath: `M ${cx} ${top} Q ${cx + curve} ${cy} ${cx} ${bottom}`,
    };
  }

  return {
    fontSize,
    useTextPath: false,
    labelPath: "",
  };
}

export function districtPathId(manifestName: string): string {
  return `district-label-${manifestName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
}
