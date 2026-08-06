import type { WeatherIconKind } from "@/lib/districtWeatherUtils";

type Bbox = [[number, number], [number, number]];

function bboxMetrics(bbox: Bbox) {
  const [[x0, y0], [x1, y1]] = bbox;
  return {
    x: x0,
    y: y0,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  };
}

function weatherTint(icon: WeatherIconKind): string {
  switch (icon) {
    case "sun":
      return "#fde047";
    case "moon":
      return "#1e3a5f";
    case "rain":
      return "#7dd3fc";
    case "storm":
      return "#475569";
    case "snow":
      return "#bae6fd";
    case "fog":
      return "#94a3b8";
    case "cloud":
    case "cloud-sun":
    case "cloud-moon":
      return "#b8c5d4";
    default:
      return "#cbd5e1";
  }
}

function patternForIcon(icon: WeatherIconKind): string | null {
  switch (icon) {
    case "rain":
      return "url(#tn-weather-rain)";
    case "storm":
      return "url(#tn-weather-storm)";
    case "snow":
      return "url(#tn-weather-snow)";
    case "fog":
      return "url(#tn-weather-fog)";
    case "cloud":
    case "cloud-sun":
    case "cloud-moon":
      return "url(#tn-weather-cloud)";
    case "sun":
      return "url(#tn-weather-sun)";
    case "moon":
      return "url(#tn-weather-moon)";
    default:
      return null;
  }
}

type DistrictWeatherOverlayProps = {
  clipPathId: string;
  bbox: Bbox;
  icon: WeatherIconKind;
  opacity?: number;
  animate?: boolean;
};

export function DistrictWeatherOverlay({
  clipPathId,
  bbox,
  icon,
  opacity = 0.56,
  animate = true,
}: DistrictWeatherOverlayProps) {
  const { x, y, width, height } = bboxMetrics(bbox);
  const tint = weatherTint(icon);
  const pattern = patternForIcon(icon);
  const tintOpacity =
    icon === "moon" ? 0.38 : icon === "sun" ? 0.32 : 0.28;

  return (
    <g clipPath={`url(#${clipPathId})`} pointerEvents="none" aria-hidden="true">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={tint}
        opacity={tintOpacity}
      />
      {pattern ? (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={pattern}
          opacity={animate ? opacity : opacity * 0.65}
        />
      ) : null}
      {icon === "storm" && animate ? (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#ffffff"
          opacity="0"
        >
          <animate
            attributeName="opacity"
            values="0;0;0.18;0"
            keyTimes="0;0.88;0.92;1"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </rect>
      ) : null}
    </g>
  );
}

export function DistrictWeatherOverlayDefs({ animate = true }: { animate?: boolean }) {
  return (
    <>
      <pattern
        id="tn-weather-rain"
        width="7"
        height="11"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(18)"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke="#0284c7" strokeWidth="1.15" opacity="0.9">
          {animate ? (
            <>
              <animate attributeName="y1" values="-2;11" dur="0.65s" repeatCount="indefinite" />
              <animate attributeName="y2" values="4;16" dur="0.65s" repeatCount="indefinite" />
            </>
          ) : null}
        </line>
      </pattern>

      <pattern
        id="tn-weather-storm"
        width="7"
        height="11"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(20)"
      >
        <line x1="0" y1="0" x2="0" y2="6.5" stroke="#2563eb" strokeWidth="1.25" opacity="0.95">
          {animate ? (
            <>
              <animate attributeName="y1" values="-2;11" dur="0.45s" repeatCount="indefinite" />
              <animate attributeName="y2" values="4;16" dur="0.45s" repeatCount="indefinite" />
            </>
          ) : null}
        </line>
      </pattern>

      <pattern
        id="tn-weather-snow"
        width="10"
        height="10"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="2.5" cy="2.5" r="0.9" fill="#ffffff" opacity="0.85">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 10"
              dur="2.8s"
              repeatCount="indefinite"
            />
          ) : null}
        </circle>
        <circle cx="7.5" cy="6.5" r="0.75" fill="#ffffff" opacity="0.7">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 -4; 0 8"
              dur="3.4s"
              repeatCount="indefinite"
            />
          ) : null}
        </circle>
      </pattern>

      <pattern
        id="tn-weather-fog"
        width="18"
        height="10"
        patternUnits="userSpaceOnUse"
      >
        <rect x="0" y="3" width="18" height="2.2" rx="1.1" fill="#64748b" opacity="0.72">
          {animate ? (
            <animate attributeName="opacity" values="0.35;0.7;0.35" dur="3.6s" repeatCount="indefinite" />
          ) : null}
        </rect>
        <rect x="0" y="6.5" width="14" height="1.8" rx="0.9" fill="#e2e8f0" opacity="0.45">
          {animate ? (
            <animate attributeName="opacity" values="0.25;0.55;0.25" dur="4.1s" repeatCount="indefinite" />
          ) : null}
        </rect>
      </pattern>

      <pattern
        id="tn-weather-cloud"
        width="36"
        height="20"
        patternUnits="userSpaceOnUse"
      >
        <ellipse cx="10" cy="15" rx="13" ry="4.2" fill="#94a3b8" opacity="0.55">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 20 0; 0 0"
              dur="24s"
              repeatCount="indefinite"
            />
          ) : null}
        </ellipse>
        <ellipse cx="28" cy="10" rx="11" ry="3.6" fill="#64748b" opacity="0.48">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -18 0; 0 0"
              dur="28s"
              repeatCount="indefinite"
            />
          ) : null}
        </ellipse>
        <ellipse cx="16" cy="6.5" rx="9" ry="2.8" fill="#cbd5e1" opacity="0.62">
          {animate ? (
            <>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 14 0.6; 24 0; 14 -0.6; 0 0"
                dur="32s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.45;0.72;0.45"
                dur="6s"
                repeatCount="indefinite"
              />
            </>
          ) : null}
        </ellipse>
        <ellipse cx="32" cy="17" rx="7" ry="2.4" fill="#b8c5d4" opacity="0.5">
          {animate ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; -22 0; 0 0"
              dur="20s"
              repeatCount="indefinite"
            />
          ) : null}
        </ellipse>
      </pattern>

      <radialGradient id="tn-weather-sun-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#facc15" stopOpacity="0.72" />
        <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
      </radialGradient>
      <pattern id="tn-weather-sun" width="1" height="1" patternContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="url(#tn-weather-sun-gradient)">
          {animate ? (
            <animate attributeName="opacity" values="0.65;0.95;0.65" dur="4s" repeatCount="indefinite" />
          ) : null}
        </rect>
      </pattern>

      <radialGradient id="tn-weather-moon-gradient" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stopColor="#334155" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#1e293b" stopOpacity="0" />
      </radialGradient>
      <pattern id="tn-weather-moon" width="1" height="1" patternContentUnits="objectBoundingBox">
        <rect width="1" height="1" fill="url(#tn-weather-moon-gradient)" />
        <circle cx="0.72" cy="0.28" r="0.035" fill="#ffffff" opacity="0.75" />
        <circle cx="0.84" cy="0.46" r="0.025" fill="#ffffff" opacity="0.55" />
        <circle cx="0.64" cy="0.58" r="0.02" fill="#ffffff" opacity="0.45" />
      </pattern>
    </>
  );
}

export function districtWeatherClipPathId(pathId: string): string {
  return `${pathId}-weather-clip`;
}
