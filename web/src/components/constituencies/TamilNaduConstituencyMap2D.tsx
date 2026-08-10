import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildConstituencyMapProjection,
  constituencyPathId,
  projectConstituencyFeatures,
} from "@/lib/constituencyMapUtils";
import { getPartyFillColor, getPartyFillColorMuted } from "@/lib/partyColorUtils";
import {
  buildConstituencyByAcNumber,
  tamilNaduConstituencyMapFeed,
} from "@/lib/tamilNaduConstituencyMapFeed";
import { tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { cn } from "@/lib/utils";

type TamilNaduConstituencyMap2DProps = {
  selectedAcNumber: number | null;
  activeAcNumbers: Set<number> | null;
  onSelectAcNumber: (acNumber: number | null) => void;
  className?: string;
};

const MAP_BACKGROUND = "#f4f4f5";
const BORDER_DEFAULT = "#ffffff";
const HOVER_STROKE = "#0f172a";
const SELECTED_STROKE = "#0369a1";

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TamilNaduConstituencyMap2D({
  selectedAcNumber,
  activeAcNumbers,
  onSelectAcNumber,
  className,
}: TamilNaduConstituencyMap2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [mapSize, setMapSize] = useState({ width: 640, height: 420 });
  const [hoveredAcNumber, setHoveredAcNumber] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  const constituencyByAc = useMemo(
    () => buildConstituencyByAcNumber(tamilNaduAssemblyConstituenciesFeed.constituencies),
    [],
  );

  const focusAcNumbers = useMemo(() => {
    if (selectedAcNumber !== null) {
      return new Set([selectedAcNumber]);
    }
    const total = tamilNaduConstituencyMapFeed.features.length;
    if (activeAcNumbers && activeAcNumbers.size > 0 && activeAcNumbers.size < total) {
      return activeAcNumbers;
    }
    return null;
  }, [activeAcNumbers, selectedAcNumber]);

  useEffect(() => {
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
  }, []);

  const { pathGenerator, viewBox } = useMemo(
    () => buildConstituencyMapProjection(mapSize.width, mapSize.height, focusAcNumbers),
    [focusAcNumbers, mapSize.height, mapSize.width],
  );

  const constituencyShapes = useMemo(
    () => projectConstituencyFeatures(pathGenerator),
    [pathGenerator],
  );

  useEffect(() => {
    const svgNode = svgRef.current;
    const zoomLayer = zoomLayerRef.current;
    if (!svgNode || !zoomLayer) return;

    const svg = select(svgNode);
    const layer = select(zoomLayer);
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
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
  }, [constituencyShapes.length, focusAcNumbers, pathGenerator, viewBox.height, viewBox.width]);

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

  const focusAcNumber = hoveredAcNumber ?? selectedAcNumber;
  const focusConstituency = focusAcNumber
    ? constituencyByAc.get(focusAcNumber) ?? null
    : null;

  function constituencyFill(acNumber: number): string {
    const constituency = constituencyByAc.get(acNumber);
    const party = constituency?.party ?? null;
    const isActive = activeAcNumbers === null || activeAcNumbers.has(acNumber);
    const isSelected = selectedAcNumber === acNumber;
    const isHovered = hoveredAcNumber === acNumber;

    if (!isActive) return getPartyFillColorMuted(party);
    if (isSelected || isHovered) return getPartyFillColor(party);
    return getPartyFillColor(party);
  }

  function constituencyStroke(acNumber: number): string {
    if (selectedAcNumber === acNumber) return SELECTED_STROKE;
    if (hoveredAcNumber === acNumber) return HOVER_STROKE;
    return BORDER_DEFAULT;
  }

  function constituencyOpacity(acNumber: number): number {
    const isActive = activeAcNumbers === null || activeAcNumbers.has(acNumber);
    if (!isActive) return 0.28;
    if (selectedAcNumber !== null && selectedAcNumber !== acNumber) return 0.55;
    return 1;
  }

  function updateTooltip(event: React.MouseEvent<SVGPathElement>, acNumber: number) {
    setHoveredAcNumber(acNumber);
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    setTooltipPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  function clearTooltip() {
    setHoveredAcNumber(null);
    setTooltipPosition(null);
  }

  function handleSelect(acNumber: number) {
    onSelectAcNumber(selectedAcNumber === acNumber ? null : acNumber);
  }

  return (
    <div ref={containerRef} className={cn("relative flex min-h-0 w-full flex-1 flex-col", className)}>
      <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {focusConstituency
              ? `${toTitleCase(focusConstituency.name)} (AC ${focusConstituency.ac_number})`
              : "Tamil Nadu constituencies"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {focusConstituency?.member_name
              ? `${focusConstituency.member_name}${focusConstituency.party ? ` · ${focusConstituency.party}` : ""}`
              : `${tamilNaduConstituencyMapFeed.features.length} assembly constituencies · party colors`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => zoomBy(0.8)} aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={resetZoom} aria-label="Reset zoom">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {tooltipPosition && focusConstituency ? (
        <div
          className="pointer-events-none absolute z-20 max-w-[220px] rounded-md border border-border bg-card px-2.5 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(tooltipPosition.x + 12, mapSize.width - 180),
            top: Math.min(tooltipPosition.y + 12, mapSize.height - 8),
          }}
        >
          <p className="font-semibold text-foreground">
            {toTitleCase(focusConstituency.name)} · AC {focusConstituency.ac_number}
          </p>
          <p className="mt-0.5 text-muted-foreground">{focusConstituency.district}</p>
          <p className="mt-1">{focusConstituency.member_name}</p>
          {focusConstituency.party ? (
            <p className="mt-0.5 font-medium text-foreground">{focusConstituency.party}</p>
          ) : null}
        </div>
      ) : null}

      <div
        ref={mapAreaRef}
        className="relative min-h-[180px] w-full flex-1 overflow-hidden"
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid slice"
          className="block h-full w-full touch-none rounded-md border border-border bg-[#f4f4f5]"
          role="img"
          aria-label="Interactive map of Tamil Nadu assembly constituencies"
        >
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill={MAP_BACKGROUND}
          />
          <g ref={zoomLayerRef}>
            {constituencyShapes.map(({ acNumber, path }) => (
              <path
                key={acNumber}
                id={constituencyPathId(acNumber)}
                d={path}
                fill={constituencyFill(acNumber)}
                fillOpacity={constituencyOpacity(acNumber)}
                stroke={constituencyStroke(acNumber)}
                strokeWidth={selectedAcNumber === acNumber || hoveredAcNumber === acNumber ? 1.2 : 0.35}
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-[fill-opacity,stroke-width] duration-150"
                onMouseEnter={(event) => updateTooltip(event, acNumber)}
                onMouseMove={(event) => updateTooltip(event, acNumber)}
                onMouseLeave={clearTooltip}
                onClick={() => handleSelect(acNumber)}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

function ConstituencyMapPanel({
  selectedAcNumber,
  activeAcNumbers,
  onSelectAcNumber,
  className,
}: TamilNaduConstituencyMap2DProps) {
  return (
    <Card className={cn("flex max-h-full min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <CardContent className="flex max-h-full min-h-0 flex-col p-3 sm:p-4">
        <TamilNaduConstituencyMap2D
          selectedAcNumber={selectedAcNumber}
          activeAcNumbers={activeAcNumbers}
          onSelectAcNumber={onSelectAcNumber}
          className="min-h-0 flex-1"
        />
        <p className="mt-2 shrink-0 text-[11px] leading-relaxed text-muted-foreground">
          Boundaries from{" "}
          <a
            href="https://projects.datameet.org/maps/assembly-constituencies/"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            DataMeet
          </a>
          . MLA data from assembly.tn.gov.in.
        </p>
      </CardContent>
    </Card>
  );
}

export { ConstituencyMapPanel };
