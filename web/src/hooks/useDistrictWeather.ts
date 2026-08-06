import { useEffect, useState } from "react";

import {
  districtWeatherToMap,
  fetchDistrictWeather,
} from "@/lib/districtWeatherFeed";
import type { DistrictWeather } from "@/lib/districtWeatherUtils";

type DistrictWeatherState = {
  weatherByDistrict: Map<string, DistrictWeather> | null;
  isLoading: boolean;
  error: string | null;
};

export function useDistrictWeather(enabled = true): DistrictWeatherState {
  const [weatherByDistrict, setWeatherByDistrict] = useState<Map<
    string,
    DistrictWeather
  > | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadWeather() {
      setIsLoading(true);
      setError(null);

      try {
        const districts = await fetchDistrictWeather();
        if (cancelled) return;
        setWeatherByDistrict(districtWeatherToMap(districts));
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load district weather",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { weatherByDistrict, isLoading, error };
}
