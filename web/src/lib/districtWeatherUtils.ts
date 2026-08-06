export type WeatherIconKind =
  | "sun"
  | "moon"
  | "cloud"
  | "cloud-sun"
  | "cloud-moon"
  | "rain"
  | "storm"
  | "fog"
  | "snow";

export type DistrictWeather = {
  districtName: string;
  latitude: number;
  longitude: number;
  temperatureC: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: WeatherIconKind;
  isDay: boolean;
  humidityPercent: number | null;
  windSpeedKmh: number | null;
  europeanAqi: number | null;
  pm25: number | null;
  aqiLabel: string | null;
  fetchedAt: string;
};

const WMO_WEATHER_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Drizzle",
  53: "Drizzle",
  55: "Drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export function weatherCodeToLabel(code: number): string {
  return WMO_WEATHER_LABELS[code] ?? "Unknown";
}

export function weatherCodeToIcon(code: number, isDay: boolean): WeatherIconKind {
  if (code === 0) return isDay ? "sun" : "moon";
  if (code === 1 || code === 2) return isDay ? "cloud-sun" : "cloud-moon";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return "rain";
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return "snow";
  }
  if (code >= 95) return "storm";
  return "cloud";
}

export function europeanAqiToLabel(aqi: number | null): string | null {
  if (aqi === null || !Number.isFinite(aqi)) return null;
  if (aqi <= 20) return "Good";
  if (aqi <= 40) return "Fair";
  if (aqi <= 60) return "Moderate";
  if (aqi <= 80) return "Poor";
  if (aqi <= 100) return "Very poor";
  return "Extremely poor";
}

export function europeanAqiToColor(aqi: number | null): string {
  if (aqi === null || !Number.isFinite(aqi)) return "#64748b";
  if (aqi <= 20) return "#15803d";
  if (aqi <= 40) return "#65a30d";
  if (aqi <= 60) return "#ca8a04";
  if (aqi <= 80) return "#ea580c";
  if (aqi <= 100) return "#dc2626";
  return "#7f1d1d";
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°C`;
}

export function formatDistrictWeatherSummary(weather: DistrictWeather): string {
  const parts = [formatTemperature(weather.temperatureC), weather.weatherLabel];
  if (weather.aqiLabel) {
    parts.push(`AQI ${weather.aqiLabel}`);
  }
  return parts.join(" · ");
}

export function readIsDay(value: unknown): boolean {
  return value === 1 || value === true;
}
