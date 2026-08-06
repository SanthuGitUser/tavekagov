import { TamilNaduDistrictMap2D } from "@/components/districts/TamilNaduDistrictMap2D";
import { Card, CardContent } from "@/components/ui/card";
import type { MapVariant } from "@/lib/districtMapUtils";
import { tamilNaduMapMeta } from "@/lib/tamilNaduMapMeta";
import type { DistrictWeather } from "@/lib/districtWeatherUtils";
import { cn } from "@/lib/utils";

type DistrictMapPanelProps = {
  selectedDistrictName: string | null;
  activeDistrictNames?: Set<string> | null;
  onSelectDistrict: (districtName: string | null) => void;
  showMissingNote?: boolean;
  enableWeather?: boolean;
  weatherByDistrict?: Map<string, DistrictWeather> | null;
  weatherLoading?: boolean;
  weatherError?: string | null;
  variant?: MapVariant;
  className?: string;
};

export function DistrictMapPanel({
  selectedDistrictName,
  activeDistrictNames = null,
  onSelectDistrict,
  showMissingNote = true,
  enableWeather = true,
  weatherByDistrict = null,
  weatherLoading = false,
  weatherError = null,
  variant = "default",
  className,
}: DistrictMapPanelProps) {

  return (
    <Card
      className={cn(
        variant === "featured"
          ? "w-fit"
          : "flex max-h-full min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
    >
      <CardContent
        className={cn(
          variant === "featured"
            ? "w-fit p-2"
            : "flex max-h-full min-h-0 flex-col p-3 sm:p-4",
        )}
      >
        <TamilNaduDistrictMap2D
          selectedDistrictName={selectedDistrictName}
          activeDistrictNames={activeDistrictNames}
          onSelectDistrict={onSelectDistrict}
          variant={variant}
          weatherByDistrict={enableWeather ? weatherByDistrict : null}
          weatherLoading={enableWeather ? weatherLoading : false}
          weatherError={enableWeather ? weatherError : null}
          className={variant === "default" ? "min-h-0 flex-1" : undefined}
        />

        {enableWeather ? (
          <p className="mt-2 shrink-0 text-[10px] leading-snug text-muted-foreground">
            {weatherLoading
              ? "Loading live weather and air quality…"
              : weatherError
                ? "Weather data unavailable right now."
                : "Live weather and air quality by district via Open-Meteo."}
          </p>
        ) : null}

        {showMissingNote && tamilNaduMapMeta.missingDistricts.length > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Map covers {tamilNaduMapMeta.featureCount} districts.{" "}
            {tamilNaduMapMeta.missingDistricts.join(", ")} is listed in the
            directory but not yet on the boundary file.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
