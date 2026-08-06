import { DistrictWeatherIcon } from "@/components/districts/DistrictWeatherIcon";
import {
  europeanAqiToColor,
  formatTemperature,
  type DistrictWeather,
} from "@/lib/districtWeatherUtils";

type DistrictWeatherTileBadgeProps = {
  weather: DistrictWeather | null;
  isLoading?: boolean;
  compact?: boolean;
};

export function DistrictWeatherTileBadge({
  weather,
  isLoading = false,
  compact = false,
}: DistrictWeatherTileBadgeProps) {
  if (isLoading && !weather) {
    return (
      <div className="inline-flex items-center rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] text-muted-foreground shadow-sm backdrop-blur">
        Loading weather…
      </div>
    );
  }

  if (!weather) return null;

  const color = europeanAqiToColor(weather.europeanAqi);

  return (
    <div
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-medium shadow-sm backdrop-blur"
      style={{ color }}
    >
      <DistrictWeatherIcon kind={weather.weatherIcon} size={12} color={color} />
      <span className="truncate">{formatTemperature(weather.temperatureC)}</span>
      {!compact ? (
        <span className="truncate text-muted-foreground">· {weather.weatherLabel}</span>
      ) : null}
    </div>
  );
}
