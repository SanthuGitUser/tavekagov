import { ExternalLink, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import { DistrictMapPanel } from "@/components/districts/DistrictMapPanel";
import { DistrictWeatherIcon } from "@/components/districts/DistrictWeatherIcon";
import { Card, CardContent } from "@/components/ui/card";
import { useDistrictSearch } from "@/context/DistrictSearchContext";
import { useDistrictWeather } from "@/hooks/useDistrictWeather";
import {
  europeanAqiToColor,
  formatTemperature,
  type DistrictWeather,
} from "@/lib/districtWeatherUtils";
import { getDistrictConstituencyCount } from "@/lib/tamilNaduConstituencies";
import { getDistrictImageUrl } from "@/lib/districtImageUtils";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import type { TnDistrict } from "@/types/models";

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function DistrictTile({
  district,
  isSelected,
  onSelect,
  weather,
  weatherLoading,
}: {
  district: TnDistrict;
  isSelected: boolean;
  onSelect: (name: string) => void;
  weather: DistrictWeather | null;
  weatherLoading: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const websiteHref = district.website_url ?? null;

  function openWebsite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!websiteHref) return;
    window.open(websiteHref, "_blank", "noopener,noreferrer");
  }

  const constituencyCount = getDistrictConstituencyCount(district.name);
  const weatherColor = weather ? europeanAqiToColor(weather.europeanAqi) : "#64748b";

  const content = (
    <>
      <div className="relative aspect-[5/4] overflow-hidden bg-muted">
        <div className="absolute left-1.5 top-1.5 z-10">
          {weather ? (
            <div
              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur"
              title={`${formatTemperature(weather.temperatureC)} · ${weather.weatherLabel}`}
            >
              <DistrictWeatherIcon
                kind={weather.weatherIcon}
                size={20}
                color={weatherColor}
              />
            </div>
          ) : weatherLoading ? (
            <div className="inline-flex h-8 w-8 animate-pulse items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur">
              <DistrictWeatherIcon kind="cloud" size={20} color="#94a3b8" />
            </div>
          ) : null}
        </div>
        {websiteHref ? (
          <button
            type="button"
            onClick={openWebsite}
            className="absolute right-1.5 top-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Visit ${district.name} website`}
            title="Visit website"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {!imageFailed ? (
          <img
            src={getDistrictImageUrl(district.name)}
            alt={district.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/5 text-primary">
            <span className="text-sm font-bold">{getInitials(district.name)}</span>
            <MapPin className="h-3.5 w-3.5 opacity-70" />
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-1.5 sm:p-2">
        <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground group-hover:text-primary sm:text-xs">
          {district.name}
        </h3>
        {weather ? (
          <p
            className="line-clamp-2 text-[9px] sm:text-[10px]"
            style={{ color: europeanAqiToColor(weather.europeanAqi) }}
          >
            {formatTemperature(weather.temperatureC)} · {weather.weatherLabel}
            {weather.aqiLabel ? ` · AQI ${weather.aqiLabel}` : ""}
          </p>
        ) : weatherLoading ? (
          <p className="text-[9px] text-muted-foreground sm:text-[10px]">
            Loading weather…
          </p>
        ) : null}
        <p className="line-clamp-2 text-[9px] text-muted-foreground sm:text-[10px]">
          <span className="font-medium text-foreground/75">Population:</span>{" "}
          {district.population ?? "—"}
        </p>
        <p className="line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
          <span className="font-medium text-foreground/75">Area:</span>{" "}
          {district.area_size ?? "—"}
        </p>
        <p className="line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
          <span className="font-medium text-foreground/75">Constituencies:</span>{" "}
          {constituencyCount ?? "—"}
        </p>
      </div>
    </>
  );

  return (
    <Card
      className={`group overflow-hidden transition-shadow ${
        isSelected ? "ring-2 ring-[#9c4a32] ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <CardContent className="p-0">
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onSelect(district.name)}
          aria-pressed={isSelected}
        >
          {content}
        </button>
      </CardContent>
    </Card>
  );
}

function DistrictTilesGrid({
  districts,
  selectedDistrictName,
  onSelect,
  weatherByDistrict,
  weatherLoading,
}: {
  districts: TnDistrict[];
  selectedDistrictName: string | null;
  onSelect: (name: string) => void;
  weatherByDistrict: Map<string, DistrictWeather> | null;
  weatherLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {districts.map((district) => (
        <DistrictTile
          key={district.id}
          district={district}
          isSelected={selectedDistrictName === district.name}
          onSelect={onSelect}
          weather={weatherByDistrict?.get(district.name) ?? null}
          weatherLoading={weatherLoading}
        />
      ))}
    </div>
  );
}

export function DistrictsPage() {
  const districtSearch = useDistrictSearch();
  const search = districtSearch?.search ?? "";
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(
    null,
  );
  const { weatherByDistrict, isLoading: weatherLoading, error: weatherError } =
    useDistrictWeather();
  const districts = useMemo(() => tamilNaduDistrictsFeed.districts, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return districts;
    return districts.filter((district) => {
      const haystack = [
        district.name,
        district.population,
        district.area_size,
        district.website_url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [districts, search]);

  const activeDistrictNames = useMemo(() => {
    if (selectedDistrictName) {
      return new Set([selectedDistrictName]);
    }
    if (search.trim()) {
      return new Set(filtered.map((district) => district.name));
    }
    return null;
  }, [filtered, search, selectedDistrictName]);

  const visibleDistricts = useMemo(() => {
    if (selectedDistrictName) {
      return filtered.filter((district) => district.name === selectedDistrictName);
    }
    return filtered;
  }, [filtered, selectedDistrictName]);

  function handleSelectDistrict(name: string | null) {
    setSelectedDistrictName(name);
  }

  function handleTileSelect(name: string) {
    setSelectedDistrictName((current) => (current === name ? null : name));
  }

  const mapColumn = (
    <div className="flex w-full shrink-0 flex-col self-start lg:sticky lg:top-0 lg:max-h-[calc(100vh-5rem)] lg:min-h-0 lg:w-[45%]">
      <DistrictMapPanel
        selectedDistrictName={selectedDistrictName}
        activeDistrictNames={activeDistrictNames}
        onSelectDistrict={handleSelectDistrict}
        weatherByDistrict={weatherByDistrict}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        className="flex max-h-full min-h-0 flex-1 flex-col"
      />
    </div>
  );

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-3">
        {mapColumn}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 lg:pt-0">
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No districts match your search.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-3">
      {mapColumn}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <DistrictTilesGrid
          districts={visibleDistricts}
          selectedDistrictName={selectedDistrictName}
          onSelect={handleTileSelect}
          weatherByDistrict={weatherByDistrict}
          weatherLoading={weatherLoading}
        />
      </div>
    </div>
  );
}
