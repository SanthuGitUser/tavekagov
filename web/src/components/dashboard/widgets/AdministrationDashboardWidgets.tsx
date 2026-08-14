import { ExternalLink, MapPin } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  DashboardEmptyState,
  DashboardWidgetCard,
} from "@/components/dashboard/DashboardWidgetCard";
import { DepartmentTile } from "@/components/government/DepartmentTile";
import { MinisterDetailPanel } from "@/components/government/MinisterDetailPanel";
import { PageLoading } from "@/components/shared/PageLoading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDistrictWeather } from "@/hooks/useDistrictWeather";
import {
  getChiefMinisterGroup,
  getFeaturedDepartments,
  getFeaturedDistricts,
  getPartySeatCounts,
  getReservedCategoryCounts,
  tamilNaduConstituencyMeta,
} from "@/lib/dashboardWidgetData";
import { resolveMinisterForDepartment } from "@/lib/governmentGroupUtils";
import { getDistrictConstituencyCount } from "@/lib/tamilNaduConstituencies";
import { getDistrictImageUrl } from "@/lib/districtImageUtils";
import { buildMinistersByKey } from "@/lib/tamilNaduMinistersFeed";
import { getPartyFlagUrl } from "@/lib/partyFlagUtils";
import type { TnDistrict } from "@/types/models";

const TamilNaduDistrictMap2D = lazy(() =>
  import("@/components/districts/TamilNaduDistrictMap2D").then((module) => ({
    default: module.TamilNaduDistrictMap2D,
  })),
);

function FeaturedDistrictTile({ district }: { district: TnDistrict }) {
  const [imageFailed, setImageFailed] = useState(false);
  const constituencyCount = getDistrictConstituencyCount(district.name);

  return (
    <Link
      to="/districts"
      className="overflow-hidden rounded-lg border border-border bg-card transition hover:border-primary/25 hover:shadow-sm"
    >
      <div className="relative aspect-[5/3] bg-muted">
        {!imageFailed ? (
          <img
            src={getDistrictImageUrl(district.name)}
            alt={district.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {district.name}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-sm font-semibold">{district.name}</p>
        <p className="text-xs text-muted-foreground">
          {district.population ?? "—"} · {district.area_size ?? "—"}
        </p>
        {constituencyCount !== null ? (
          <p className="text-xs text-muted-foreground">{constituencyCount} constituencies</p>
        ) : null}
      </div>
    </Link>
  );
}

export function DepartmentsTilesWidget() {
  const departments = getFeaturedDepartments(6);
  const ministersByKey = useMemo(() => buildMinistersByKey(), []);

  return (
    <DashboardWidgetCard
      title="Departments tiles"
      description="Featured department directory cards"
      viewAllTo="/departments"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {departments.map((department) => (
          <DepartmentTile
            key={department.id}
            department={department}
            showMinister
            minister={resolveMinisterForDepartment(department.minister_name, ministersByKey)}
          />
        ))}
      </div>
    </DashboardWidgetCard>
  );
}

export function MinistersChiefMinisterWidget() {
  const group = getChiefMinisterGroup();

  return (
    <DashboardWidgetCard
      title="Chief Minister spotlight"
      description="Featured minister detail panel"
      viewAllTo="/ministers"
    >
      {!group ? (
        <DashboardEmptyState message="Chief minister data is unavailable." />
      ) : (
        <MinisterDetailPanel group={group} />
      )}
    </DashboardWidgetCard>
  );
}

export function DistrictsFeaturedWidget() {
  const districts = getFeaturedDistricts(4);

  return (
    <DashboardWidgetCard
      title="Featured districts"
      description="District tile preview"
      viewAllTo="/districts"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {districts.map((district) => (
          <FeaturedDistrictTile key={district.id} district={district} />
        ))}
      </div>
    </DashboardWidgetCard>
  );
}

export function DistrictsMiniMapWidget() {
  const { weatherByDistrict, isLoading, error } = useDistrictWeather(true);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>(null);

  return (
    <DashboardWidgetCard
      title="District mini map"
      description="Interactive map preview with optional weather overlay"
      viewAllTo="/districts"
      contentClassName="p-0"
    >
      <div className="h-[22rem] overflow-hidden rounded-md border border-border/70">
        <Suspense fallback={<PageLoading label="Loading map…" className="min-h-[22rem] border-0" />}>
          <TamilNaduDistrictMap2D
            selectedDistrictName={selectedDistrictName}
            activeDistrictNames={null}
            onSelectDistrict={setSelectedDistrictName}
            variant="featured"
            mapMode="weather"
            weatherByDistrict={weatherByDistrict}
            weatherLoading={isLoading}
            weatherError={error}
            className="h-full"
          />
        </Suspense>
      </div>
      {selectedDistrictName ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selectedDistrictName}</span>
        </p>
      ) : null}
    </DashboardWidgetCard>
  );
}

export function ConstituenciesPartyBreakdownWidget() {
  const partyCounts = getPartySeatCounts();
  const reservedCounts = getReservedCategoryCounts();
  const maxSeats = Math.max(...partyCounts.map((entry) => entry.seats), 1);

  return (
    <DashboardWidgetCard
      title="Constituency party breakdown"
      description="Seat composition and reserved categories"
      viewAllTo="/constituencies"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {reservedCounts.map((entry) => (
            <Badge key={entry.category} variant="secondary">
              {entry.category}: {entry.seats}
            </Badge>
          ))}
        </div>
        <div className="space-y-2">
          {partyCounts.slice(0, 8).map((entry) => {
            const flagUrl = getPartyFlagUrl(entry.party);
            return (
              <div key={entry.party} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    {flagUrl ? (
                      <img src={flagUrl} alt="" className="h-5 w-8 rounded border border-border/60 object-cover" />
                    ) : null}
                    <span className="truncate font-medium">{entry.party}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{entry.seats}</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary/80"
                    style={{ width: `${Math.max(8, (entry.seats / maxSeats) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardWidgetCard>
  );
}

export function MapsMetaWidget() {
  return (
    <DashboardWidgetCard
      title="Map metadata"
      description="GeoJSON coverage summary"
      viewAllTo="/districts"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border/70 bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            District boundaries
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{tamilNaduConstituencyMeta.totalDistricts}</p>
          <p className="mt-1 text-xs text-muted-foreground">Mapped districts in TN-Map geojson</p>
        </div>
        <div className="rounded-md border border-border/70 bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-primary" />
            Constituency boundaries
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {tamilNaduConstituencyMeta.totalConstituencies}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Assembly constituencies on map layer</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/districts">Open districts map</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/constituencies">Open constituencies map</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a
            href="https://github.com/udit-001/india-maps-data"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1"
          >
            Map data source
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </DashboardWidgetCard>
  );
}
