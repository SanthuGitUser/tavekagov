import type { WeatherIconKind } from "@/lib/districtWeatherUtils";

type DistrictWeatherIconProps = {
  kind: WeatherIconKind;
  size: number;
  color: string;
  className?: string;
};

export function DistrictWeatherIcon({
  kind,
  size,
  color,
  className,
}: DistrictWeatherIconProps) {
  const fill = color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {kind === "sun" ? (
        <>
          <circle cx="8" cy="8" r="3" fill={fill} />
          <rect x="7.4" y="1" width="1.2" height="2.2" rx="0.6" fill={fill} />
          <rect x="7.4" y="12.8" width="1.2" height="2.2" rx="0.6" fill={fill} />
          <rect x="1" y="7.4" width="2.2" height="1.2" rx="0.6" fill={fill} />
          <rect x="12.8" y="7.4" width="2.2" height="1.2" rx="0.6" fill={fill} />
          <rect
            x="3.1"
            y="3.1"
            width="1.2"
            height="2.2"
            rx="0.6"
            fill={fill}
            transform="rotate(-45 3.7 4.2)"
          />
          <rect
            x="11.7"
            y="3.1"
            width="1.2"
            height="2.2"
            rx="0.6"
            fill={fill}
            transform="rotate(45 12.3 4.2)"
          />
          <rect
            x="3.1"
            y="10.7"
            width="1.2"
            height="2.2"
            rx="0.6"
            fill={fill}
            transform="rotate(45 3.7 11.8)"
          />
          <rect
            x="11.7"
            y="10.7"
            width="1.2"
            height="2.2"
            rx="0.6"
            fill={fill}
            transform="rotate(-45 12.3 11.8)"
          />
        </>
      ) : null}

      {kind === "moon" ? (
        <path
          d="M11.2 2.4a5.6 5.6 0 1 0 2.4 10.4 4.4 4.4 0 1 1 0-8.8 5.2 5.2 0 0 1-2.4-1.6Z"
          fill={fill}
        />
      ) : null}

      {kind === "cloud" ||
      kind === "cloud-sun" ||
      kind === "cloud-moon" ||
      kind === "rain" ||
      kind === "storm" ||
      kind === "snow" ? (
        <path
          d="M11.8 6.2a3.1 3.1 0 0 0-5.9-1 2.6 2.6 0 0 0-.5 5.1h6.4a2.2 2.2 0 0 0 .3-4.4 3 3 0 0 0-.3-.7Z"
          fill={fill}
        />
      ) : null}

      {kind === "cloud-sun" ? (
        <>
          <circle cx="5.2" cy="5.2" r="2.1" fill={fill} />
          <rect x="4.8" y="2.2" width="0.8" height="1.2" rx="0.4" fill={fill} />
          <rect x="4.8" y="7" width="0.8" height="1.2" rx="0.4" fill={fill} />
          <rect x="2.2" y="4.8" width="1.2" height="0.8" rx="0.4" fill={fill} />
          <rect x="7" y="4.8" width="1.2" height="0.8" rx="0.4" fill={fill} />
        </>
      ) : null}

      {kind === "cloud-moon" ? (
        <path
          d="M4.8 3.2a3 3 0 0 0-1.2 5.8 2.2 2.2 0 0 1 0-4.2 2.8 2.8 0 0 1 1.2-.8Z"
          fill={fill}
        />
      ) : null}

      {kind === "rain" ? (
        <>
          <rect x="5.2" y="11.2" width="1" height="2.4" rx="0.5" fill={fill} />
          <rect x="7.5" y="11.8" width="1" height="2.4" rx="0.5" fill={fill} />
          <rect x="9.8" y="11.2" width="1" height="2.4" rx="0.5" fill={fill} />
        </>
      ) : null}

      {kind === "storm" ? (
        <path d="M8.4 10.8 7.2 13.2h1.4l-1 2.2 2.6-3.2H8.7l1.1-2.2H8.4Z" fill={fill} />
      ) : null}

      {kind === "snow" ? (
        <>
          <rect x="7.5" y="11.2" width="1" height="2.2" rx="0.5" fill={fill} />
          <rect x="6.2" y="12" width="2.2" height="1" rx="0.5" fill={fill} />
          <rect x="9.8" y="12.5" width="0.9" height="1.8" rx="0.45" fill={fill} />
          <rect x="9.1" y="11.8" width="1.8" height="0.9" rx="0.45" fill={fill} />
        </>
      ) : null}

      {kind === "fog" ? (
        <>
          <rect x="2.5" y="5.5" width="11" height="1.2" rx="0.6" fill={fill} />
          <rect x="3.5" y="8" width="9" height="1.2" rx="0.6" fill={fill} />
          <rect x="2.5" y="10.5" width="11" height="1.2" rx="0.6" fill={fill} />
        </>
      ) : null}
    </svg>
  );
}
