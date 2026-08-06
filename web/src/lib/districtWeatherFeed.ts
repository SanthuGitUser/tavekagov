import { getDistrictWeatherCoordinates } from "@/lib/districtWeatherCoords";
import {
  europeanAqiToLabel,
  readIsDay,
  type DistrictWeather,
  weatherCodeToIcon,
  weatherCodeToLabel,
} from "@/lib/districtWeatherUtils";

const FORECAST_API = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_API = "https://air-quality-api.open-meteo.com/v1/air-quality";
const CACHE_KEY = "tn-district-weather-v2";
const CACHE_TTL_MS = 20 * 60 * 1000;

type ForecastCurrent = {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  is_day?: number;
};

type ForecastLocationResponse = {
  latitude: number;
  longitude: number;
  current?: ForecastCurrent;
};

type AirQualityCurrent = {
  european_aqi?: number;
  pm2_5?: number;
};

type AirQualityLocationResponse = {
  latitude: number;
  longitude: number;
  current?: AirQualityCurrent;
};

type WeatherCachePayload = {
  fetchedAt: number;
  districts: DistrictWeather[];
};

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readCache(): WeatherCachePayload | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherCachePayload;
    if (!Array.isArray(parsed.districts) || typeof parsed.fetchedAt !== "number") {
      return null;
    }
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(districts: DistrictWeather[]): void {
  if (typeof sessionStorage === "undefined") return;

  const payload: WeatherCachePayload = {
    fetchedAt: Date.now(),
    districts,
  };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

function buildCoordinateQuery(
  coordinates: readonly { latitude: number; longitude: number }[],
): { latitude: string; longitude: string } {
  return {
    latitude: coordinates.map((entry) => entry.latitude.toFixed(4)).join(","),
    longitude: coordinates.map((entry) => entry.longitude.toFixed(4)).join(","),
  };
}

async function fetchForecast(
  coordinates: readonly { latitude: number; longitude: number }[],
): Promise<ForecastLocationResponse[]> {
  const { latitude, longitude } = buildCoordinateQuery(coordinates);
  const url = new URL(FORECAST_API);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
  );
  url.searchParams.set("timezone", "Asia/Kolkata");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather forecast request failed (${response.status})`);
  }

  const data = (await response.json()) as
    | ForecastLocationResponse
    | ForecastLocationResponse[];
  return Array.isArray(data) ? data : [data];
}

async function fetchAirQuality(
  coordinates: readonly { latitude: number; longitude: number }[],
): Promise<AirQualityLocationResponse[]> {
  const { latitude, longitude } = buildCoordinateQuery(coordinates);
  const url = new URL(AIR_QUALITY_API);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "european_aqi,pm2_5");
  url.searchParams.set("timezone", "Asia/Kolkata");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Air quality request failed (${response.status})`);
  }

  const data = (await response.json()) as
    | AirQualityLocationResponse
    | AirQualityLocationResponse[];
  return Array.isArray(data) ? data : [data];
}

export async function fetchDistrictWeather(): Promise<DistrictWeather[]> {
  const cached = readCache();
  if (cached) return cached.districts;

  const coordinates = getDistrictWeatherCoordinates();
  if (coordinates.length === 0) {
    return [];
  }

  const [forecastRows, airQualityRows] = await Promise.all([
    fetchForecast(coordinates),
    fetchAirQuality(coordinates),
  ]);

  if (forecastRows.length !== coordinates.length) {
    throw new Error("Weather forecast returned an unexpected number of locations");
  }

  const fetchedAt = new Date().toISOString();
  const districts = coordinates.map((coordinate, index) => {
    const forecast = forecastRows[index]?.current ?? {};
    const airQuality = airQualityRows[index]?.current ?? {};
    const temperatureC = readNumber(forecast.temperature_2m);
    const weatherCode = readNumber(forecast.weather_code) ?? 0;
    const europeanAqi = readNumber(airQuality.european_aqi);
    const isDay = readIsDay(forecast.is_day);

    if (temperatureC === null) {
      throw new Error(`Missing temperature for ${coordinate.districtName}`);
    }

    return {
      districtName: coordinate.districtName,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      temperatureC,
      weatherCode,
      weatherLabel: weatherCodeToLabel(weatherCode),
      weatherIcon: weatherCodeToIcon(weatherCode, isDay),
      isDay,
      humidityPercent: readNumber(forecast.relative_humidity_2m),
      windSpeedKmh: readNumber(forecast.wind_speed_10m),
      europeanAqi,
      pm25: readNumber(airQuality.pm2_5),
      aqiLabel: europeanAqiToLabel(europeanAqi),
      fetchedAt,
    } satisfies DistrictWeather;
  });

  writeCache(districts);
  return districts;
}

export function districtWeatherToMap(
  districts: DistrictWeather[],
): Map<string, DistrictWeather> {
  return new Map(districts.map((entry) => [entry.districtName, entry]));
}
