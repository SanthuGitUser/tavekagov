import { geoCentroid } from "d3-geo";
import type { Feature } from "geojson";

import {
  geoDistrictNameToManifest,
  getDistrictFeatures,
} from "@/lib/tamilNaduMapFeed";

export type DistrictCoordinate = {
  districtName: string;
  latitude: number;
  longitude: number;
};

const districtWeatherCoordinates: DistrictCoordinate[] = getDistrictFeatures().map(
  (feature) => {
    const districtName = geoDistrictNameToManifest(feature.properties.district);
    const [longitude, latitude] = geoCentroid(feature as Feature);
    return { districtName, latitude, longitude };
  },
);

const districtWeatherCoordinateMap = new Map(
  districtWeatherCoordinates.map((entry) => [entry.districtName, entry]),
);

export function getDistrictWeatherCoordinates(): readonly DistrictCoordinate[] {
  return districtWeatherCoordinates;
}

export function getDistrictWeatherCoordinate(
  districtName: string,
): DistrictCoordinate | undefined {
  return districtWeatherCoordinateMap.get(districtName);
}
