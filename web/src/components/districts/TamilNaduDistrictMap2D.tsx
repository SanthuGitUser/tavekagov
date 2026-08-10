import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import type { FeatureCollection } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Minus, Plus, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistrictSearch } from "@/context/DistrictSearchContext";
import {
  geoDistrictNameToManifest,
  getDistrictFeatures,
  type DistrictGeoFeature,
} from "@/lib/tamilNaduMapFeed";
import {
  buildMapProjection,
  computeDistrictLabelLayout,
  districtPathId,
  type LabelLayout,
  type MapVariant,
} from "@/lib/districtMapUtils";
import {
  formatConstituencyCount,
  getDistrictConstituencyCount,
  tamilNaduConstituencyMeta,
} from "@/lib/tamilNaduConstituencies";
import { DistrictWeatherMarker } from "@/components/districts/DistrictWeatherMarker";
import {
  DistrictMapModeTabs,
  type DistrictMapMode,
} from "@/components/districts/DistrictMapModeTabs";
import {
  DistrictWeatherOverlay,
  DistrictWeatherOverlayDefs,
  districtWeatherClipPathId,
} from "@/components/districts/DistrictWeatherOverlay";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  formatDistrictWeatherSummary,
  type DistrictWeather,
} from "@/lib/districtWeatherUtils";
import { cn } from "@/lib/utils";

type TamilNaduDistrictMap2DProps = {
  selectedDistrictName: string | null;
  activeDistrictNames: Set<string> | null;
  onSelectDistrict: (districtName: string | null) => void;
  className?: string;
  variant?: MapVariant;
  mapMode?: DistrictMapMode;
  onMapModeChange?: (mode: DistrictMapMode) => void;
  weatherByDistrict?: Map<string, DistrictWeather> | null;
  weatherLoading?: boolean;
  weatherError?: string | null;
};

type ProjectedFeature = {
  feature: DistrictGeoFeature;
  manifestName: string;
  path: string;
  centroid: [number, number] | null;
  bbox: [[number, number], [number, number]];
  label: LabelLayout;
  pathId: string;
};

const MAP_BACKGROUND = "#f4f4f5";
const DISTRICT_FILL = "#dce8f3";
const DISTRICT_DIMMED = "#c5d5e4";
const HOVER_FILL = "#93c5fd";
const HOVER_STROKE = "#0284c7";
const SELECTED_FILL = "#60a5fa";
const SELECTED_STROKE = "#0369a1";
const BORDER_DEFAULT = "#5b6b7c";
const LABEL_HOVER = "#0c4a6e";

export function TamilNaduDistrictMap2D({
  selectedDistrictName,
  activeDistrictNames,
  onSelectDistrict,
  className,
  variant = "default",
  mapMode = "weather",
  onMapModeChange,
  weatherByDistrict = null,
  weatherLoading = false,
  weatherError = null,
}: TamilNaduDistrictMap2DProps) {
  const showWeather = mapMode === "weather";
  const districtSearch = useDistrictSearch();
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(
    null,
  );
  const [mapSize, setMapSize] = useState({ width: 640, height: 480 });
  const [viewportTick, setViewportTick] = useState(0);
  const [hoveredDistrictName, setHoveredDistrictName] = useState<string | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (variant === "featured") {
      const onResize = () => setViewportTick((tick) => tick + 1);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const node = mapAreaRef.current;
    if (!node) return;

    const updateSize = () => {
      setMapSize({
        width: Math.max(200, Math.floor(node.clientWidth)),
        height: Math.max(160, Math.floor(node.clientHeight)),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [variant]);

  const layoutWidth = variant === "featured" ? 0 : mapSize.width;
  const layoutHeight = variant === "featured" ? undefined : mapSize.height;

  const { pathGenerator, viewBox, renderWidth, renderHeight } = useMemo(
    () => buildMapProjection(layoutWidth, variant, layoutHeight),
    [layoutWidth, layoutHeight, variant, viewportTick],
  );

  const districtShapes = useMemo(() => {
    const features = getDistrictFeatures();

    return features.map((feature) => {
      const manifestName = geoDistrictNameToManifest(feature.properties.district);
      const geoFeature = feature as FeatureCollection["features"][number];
      const path = pathGenerator(geoFeature) ?? "";
      const centroid = pathGenerator.centroid(geoFeature);
      const area = pathGenerator.area(geoFeature) ?? 0;
      const bbox = pathGenerator.bounds(geoFeature);
      const hasCentroid =
        Number.isFinite(centroid[0]) && Number.isFinite(centroid[1]);

      return {
        feature,
        manifestName,
        path,
        centroid: hasCentroid ? (centroid as [number, number]) : null,
        bbox: bbox as [[number, number], [number, number]],
        label: hasCentroid
          ? computeDistrictLabelLayout(
              manifestName,
              area,
              bbox as [[number, number], [number, number]],
              centroid as [number, number],
            )
          : { fontSize: 8, useTextPath: false, labelPath: "" },
        pathId: districtPathId(manifestName),
      } satisfies ProjectedFeature;
    });
  }, [pathGenerator, viewBox.height, viewBox.width]);

  useEffect(() => {
    const svgNode = svgRef.current;
    const zoomLayer = zoomLayerRef.current;
    if (!svgNode || !zoomLayer) return;

    const svg = select(svgNode);
    const layer = select(zoomLayer);

    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .on("zoom", (event) => {
        layer.attr("transform", event.transform.toString());
      });

    zoomBehaviorRef.current = behavior;
    svg.call(behavior);
    svg.call(behavior.transform, zoomIdentity);
    svg.on("dblclick.zoom", null);

    return () => {
      svg.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [districtShapes.length, pathGenerator, viewBox.height, viewBox.width]);

  const resetZoom = useCallback(() => {
    const svgNode = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    if (!svgNode || !behavior) return;
    select(svgNode).call(behavior.transform, zoomIdentity);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const svgNode = svgRef.current;
    const behavior = zoomBehaviorRef.current;
    if (!svgNode || !behavior) return;
    select(svgNode).call(behavior.scaleBy, factor);
  }, []);

  const focusDistrictName = hoveredDistrictName ?? selectedDistrictName;
  const focusWeather = showWeather && focusDistrictName
    ? weatherByDistrict?.get(focusDistrictName) ?? null
    : null;

  const mapContextSubtitle = showWeather
    ? focusWeather
      ? formatDistrictWeatherSummary(focusWeather)
      : weatherLoading
        ? "Loading live weather…"
        : weatherError
          ? "Weather unavailable"
          : "Live weather on map"
    : focusDistrictName
      ? formatConstituencyCount(getDistrictConstituencyCount(focusDistrictName))
      : "District boundaries";

  const handleSelect = useCallback(
    (manifestName: string) => {
      onSelectDistrict(
        selectedDistrictName === manifestName ? null : manifestName,
      );
    },
    [onSelectDistrict, selectedDistrictName],
  );

  function updateTooltip(
    event: React.MouseEvent<SVGPathElement>,
    manifestName: string,
    isActive: boolean,
  ) {
    if (!isActive) return;
    setHoveredDistrictName(manifestName);
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  function clearTooltip() {
    setHoveredDistrictName(null);
    setTooltipPosition(null);
  }

  function districtFill(manifestName: string): string {
    const isSelected = selectedDistrictName === manifestName;
    const isHovered = hoveredDistrictName === manifestName;
    const isActive =
      activeDistrictNames === null || activeDistrictNames.has(manifestName);
    const isDimmed = activeDistrictNames !== null && !isActive;

    if (isSelected) return SELECTED_FILL;
    if (isHovered) return HOVER_FILL;
    if (isDimmed) return DISTRICT_DIMMED;
    return DISTRICT_FILL;
  }

  function districtStroke(manifestName: string): string {
    const isSelected = selectedDistrictName === manifestName;
    const isHovered = hoveredDistrictName === manifestName;
    if (isSelected) return SELECTED_STROKE;
    if (isHovered) return HOVER_STROKE;
    return BORDER_DEFAULT;
  }

  function labelFill(manifestName: string): string {
    const isSelected = selectedDistrictName === manifestName;
    const isHovered = hoveredDistrictName === manifestName;
    if (isSelected || isHovered) return LABEL_HOVER;
    return "#1e293b";
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative",
        variant === "featured" ? "w-fit" : "flex min-h-0 w-full flex-1 flex-col",
        className,
      )}
    >
      {variant === "default" ? (
        <div className="mb-2 flex shrink-0 flex-col gap-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
            <p className="truncate text-sm font-semibold text-foreground">
              {focusDistrictName ?? "Tamil Nadu"}
            </p>
            <p className="shrink-0 whitespace-nowrap text-right text-xs text-muted-foreground">
              {tamilNaduConstituencyMeta.totalDistricts} districts ·{" "}
              {tamilNaduConstituencyMeta.totalConstituencies} constituencies
            </p>
          </div>

          {onMapModeChange ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {mapContextSubtitle}
              </p>
              <DistrictMapModeTabs
                mode={mapMode}
                onModeChange={onMapModeChange}
                className="justify-self-center"
              />
              {districtSearch ? (
                <div className="relative w-full justify-self-end">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search districts…"
                    value={districtSearch.search}
                    onChange={(event) => districtSearch.setSearch(event.target.value)}
                    className="h-8 w-full pl-7 text-xs"
                    aria-label="Search districts"
                  />
                </div>
              ) : (
                <div />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
              <p className="min-w-0 truncate text-xs text-muted-foreground">
                {mapContextSubtitle}
              </p>
              {districtSearch ? (
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search districts…"
                    value={districtSearch.search}
                    onChange={(event) => districtSearch.setSearch(event.target.value)}
                    className="h-8 w-full pl-7 text-xs"
                    aria-label="Search districts"
                  />
                </div>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>
      ) : null}

      {hoveredDistrictName && tooltipPosition ? (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-md"
          style={{
            left: Math.min(tooltipPosition.x + 12, mapSize.width - 120),
            top: Math.min(tooltipPosition.y + 12, mapSize.height - 8),
          }}
        >
          {(() => {
            const hoveredWeather = showWeather
              ? weatherByDistrict?.get(hoveredDistrictName) ?? null
              : null;
            return (
              <>
                <p className="font-semibold text-foreground">{hoveredDistrictName}</p>
                {hoveredWeather ? (
                  <>
                    <p className="mt-1 text-foreground">
                      {formatDistrictWeatherSummary(hoveredWeather)}
                    </p>
                    {hoveredWeather.humidityPercent !== null ? (
                      <p className="mt-1 text-muted-foreground">
                        Humidity {hoveredWeather.humidityPercent}%
                        {hoveredWeather.windSpeedKmh !== null
                          ? ` · Wind ${Math.round(hoveredWeather.windSpeedKmh)} km/h`
                          : ""}
                      </p>
                    ) : null}
                    {hoveredWeather.pm25 !== null ? (
                      <p className="mt-1 text-muted-foreground">
                        PM2.5 {hoveredWeather.pm25} µg/m³
                      </p>
                    ) : null}
                  </>
                ) : showWeather && weatherLoading ? (
                  <p className="mt-1 text-muted-foreground">Loading weather…</p>
                ) : null}
                <p className="mt-1 text-muted-foreground">
                  {formatConstituencyCount(
                    getDistrictConstituencyCount(hoveredDistrictName),
                  )}
                </p>
              </>
            );
          })()}
        </div>
      ) : null}

      <div
        ref={mapAreaRef}
        className={cn(
          "relative w-full",
          variant === "default"
            ? "min-h-[180px] flex-1 overflow-hidden"
            : "w-fit",
        )}
      >
        <div className="absolute bottom-2 right-2 z-10 flex flex-col gap-1">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm"
            aria-label="Zoom in"
            onClick={() => zoomBy(1.35)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / 1.35)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="h-7 w-7 bg-background/90 shadow-sm"
            aria-label="Reset zoom"
            onClick={resetZoom}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          role="img"
          aria-label="Interactive map of Tamil Nadu districts"
          preserveAspectRatio={
            variant === "default" ? "xMidYMid slice" : "xMidYMid meet"
          }
          className={cn(
            "block cursor-grab touch-none rounded-md border border-border bg-[#f4f4f5] active:cursor-grabbing",
            variant === "default" ? "h-full w-full" : undefined,
          )}
          style={
            variant === "featured"
              ? { width: renderWidth, height: renderHeight }
              : undefined
          }
        >
          <defs>
            <DistrictWeatherOverlayDefs animate={!prefersReducedMotion} />
            {districtShapes.map(({ pathId, path, label }) => (
              <Fragment key={pathId}>
                {label.useTextPath ? (
                  <path id={pathId} d={label.labelPath} fill="none" />
                ) : null}
                <clipPath id={districtWeatherClipPathId(pathId)}>
                  <path d={path} />
                </clipPath>
              </Fragment>
            ))}
          </defs>
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill={MAP_BACKGROUND}
            onClick={clearTooltip}
          />
          <g ref={zoomLayerRef}>
            {districtShapes.map(
              ({ feature, manifestName, path, centroid, bbox, label, pathId }) => {
                const isSelected = selectedDistrictName === manifestName;
                const isHovered = hoveredDistrictName === manifestName;
                const isActive =
                  activeDistrictNames === null ||
                  activeDistrictNames.has(manifestName);
                const labelFillColor = labelFill(manifestName);
                const labelWeight = isSelected || isHovered ? 700 : 600;
                const districtWeather = showWeather
                  ? weatherByDistrict?.get(manifestName) ?? null
                  : null;
                const weatherFontSize = Math.max(5.5, label.fontSize * 0.88);
                const weatherOffsetY = label.fontSize * 1.05;

                if (!path) return null;

                return (
                  <g key={feature.properties.district}>
                    <path
                      d={path}
                      fill={districtFill(manifestName)}
                      stroke="none"
                      opacity={isActive ? 1 : 0.45}
                      className={isActive ? "cursor-pointer" : "cursor-default"}
                      tabIndex={isActive ? 0 : -1}
                      aria-label={manifestName}
                      onMouseEnter={(event) => {
                        updateTooltip(event, manifestName, isActive);
                      }}
                      onMouseMove={(event) => {
                        updateTooltip(event, manifestName, isActive);
                      }}
                      onMouseLeave={clearTooltip}
                      onFocus={() => {
                        if (isActive) setHoveredDistrictName(manifestName);
                      }}
                      onBlur={clearTooltip}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (isActive) handleSelect(manifestName);
                      }}
                      onKeyDown={(event) => {
                        if (!isActive) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleSelect(manifestName);
                        }
                      }}
                    />
                    {districtWeather ? (
                      <DistrictWeatherOverlay
                        clipPathId={districtWeatherClipPathId(pathId)}
                        bbox={bbox}
                        icon={districtWeather.weatherIcon}
                        opacity={
                          isActive
                            ? isSelected || isHovered
                              ? 0.68
                              : 0.56
                            : 0.22
                        }
                        animate={!prefersReducedMotion}
                      />
                    ) : null}
                    <path
                      d={path}
                      fill="none"
                      stroke={districtStroke(manifestName)}
                      strokeWidth={isSelected || isHovered ? 1.25 : 0.55}
                      opacity={isActive ? 1 : 0.45}
                      pointerEvents="none"
                    />
                    {centroid ? (
                      label.useTextPath ? (
                        <>
                          <text
                            pointerEvents="none"
                            fontSize={label.fontSize}
                            fontWeight={labelWeight}
                            fill={labelFillColor}
                            stroke="#ffffff"
                            strokeWidth={2}
                            paintOrder="stroke fill"
                          >
                            <textPath
                              href={`#${pathId}`}
                              startOffset="50%"
                              textAnchor="middle"
                            >
                              {manifestName}
                            </textPath>
                          </text>
                          {districtWeather ? (
                            <DistrictWeatherMarker
                              x={centroid[0]}
                              y={centroid[1] + weatherOffsetY}
                              fontSize={weatherFontSize}
                              weather={districtWeather}
                            />
                          ) : null}
                        </>
                      ) : (
                        <>
                          <text
                            x={centroid[0]}
                            y={centroid[1] - weatherOffsetY * 0.35}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            pointerEvents="none"
                            fontSize={label.fontSize}
                            fontWeight={labelWeight}
                            fill={labelFillColor}
                            stroke="#ffffff"
                            strokeWidth={2.5}
                            paintOrder="stroke fill"
                          >
                            {manifestName}
                          </text>
                          {districtWeather ? (
                            <DistrictWeatherMarker
                              x={centroid[0]}
                              y={centroid[1] + weatherOffsetY}
                              fontSize={weatherFontSize}
                              weather={districtWeather}
                            />
                          ) : null}
                        </>
                      )
                    ) : null}
                  </g>
                );
              },
            )}
          </g>
        </svg>
      </div>
    </div>
  );
}
