import { DistrictWeatherIcon } from "@/components/districts/DistrictWeatherIcon";
import {
  europeanAqiToColor,
  formatTemperature,
  type DistrictWeather,
} from "@/lib/districtWeatherUtils";

type DistrictWeatherMarkerProps = {
  x: number;
  y: number;
  fontSize: number;
  weather: DistrictWeather;
};

export function DistrictWeatherMarker({
  x,
  y,
  fontSize,
  weather,
}: DistrictWeatherMarkerProps) {
  const color = europeanAqiToColor(weather.europeanAqi);
  const iconSize = fontSize * 1.55;
  const temp = formatTemperature(weather.temperatureC);
  const gap = fontSize * 0.28;
  const tempWidth = temp.length * fontSize * 0.56;
  const totalWidth = iconSize + gap + tempWidth;
  const startX = x - totalWidth / 2;

  return (
    <g pointerEvents="none">
      <g transform={`translate(${startX}, ${y - iconSize / 2})`}>
        <DistrictWeatherIcon
          kind={weather.weatherIcon}
          size={iconSize}
          color={color}
        />
      </g>
      <text
        x={startX + iconSize + gap}
        y={y}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight={600}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
        paintOrder="stroke fill"
      >
        {temp}
      </text>
    </g>
  );
}
