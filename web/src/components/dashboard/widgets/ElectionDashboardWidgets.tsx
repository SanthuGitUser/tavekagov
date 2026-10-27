import { Landmark, Trophy, Vote } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  DashboardEmptyState,
  DashboardWidgetCard,
} from "@/components/dashboard/DashboardWidgetCard";
import { PageLoading } from "@/components/shared/PageLoading";
import { Badge } from "@/components/ui/badge";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  loadByeVsMayComparisons,
  loadMay2026DashboardAnalytics,
  selectMarginRaces,
  type ByeVsMayAcComparison,
  type May2026CloseRaceRow,
  type May2026DashboardAnalytics,
  type May2026MarginMetric,
  type May2026MarginPartyFilter,
} from "@/lib/dashboardElectionWidgetData";
import { getPartyFillColor, getPartyFillColorMuted } from "@/lib/partyColorUtils";
import { getPartyFlagUrl } from "@/lib/partyFlagUtils";
import { cn } from "@/lib/utils";

function useMay2026Analytics() {
  return useAsyncData(() => loadMay2026DashboardAnalytics(), []);
}

function useByeVsMayComparisons() {
  return useAsyncData(() => loadByeVsMayComparisons(), []);
}

function GroupedShareBars({ row, maxShare }: { row: ByeVsMayAcComparison["parties"][number]; maxShare: number }) {
  const flagUrl = getPartyFlagUrl(row.party);
  const mayWidth = maxShare > 0 ? (row.mayShare / maxShare) * 100 : 0;
  const byeWidth = maxShare > 0 ? (row.byeShare / maxShare) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium">
        {flagUrl ? (
          <img src={flagUrl} alt="" className="h-4 w-6 rounded border border-border/60 object-cover" />
        ) : null}
        <span>{row.party}</span>
      </div>
      <div className="grid gap-1 sm:grid-cols-2">
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>May 2026 general</span>
            <span className="tabular-nums">{row.mayShare.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary/85"
              style={{ width: `${Math.max(row.mayShare > 0 ? 4 : 0, mayWidth)}%` }}
            />
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Oct 2026 bye</span>
            <span className="tabular-nums">{row.byeShare.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-amber-500/80"
              style={{ width: `${Math.max(row.byeShare > 0 ? 4 : 0, byeWidth)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AcByeVsMayChart({ comparison }: { comparison: ByeVsMayAcComparison }) {
  const maxShare = Math.max(
    ...comparison.parties.flatMap((row) => [row.mayShare, row.byeShare]),
    1,
  );

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">
            {comparison.constituencyName}{" "}
            <span className="font-normal text-muted-foreground">(AC {comparison.acNumber})</span>
          </h3>
          {comparison.district ? (
            <p className="text-xs text-muted-foreground">{comparison.district}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          <Badge variant="outline" className="tabular-nums">
            May lead: {comparison.mayLeadingParty}
          </Badge>
          <Badge variant="secondary" className="tabular-nums">
            Bye lead: {comparison.byeLeadingParty}
          </Badge>
        </div>
      </div>
      <div className="space-y-3">
        {comparison.parties.map((row) => (
          <GroupedShareBars key={row.party} row={row} maxShare={maxShare} />
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        Vote share from final ECI round · May total {comparison.mayTotalVotes.toLocaleString()} · Bye total{" "}
        {comparison.byeTotalVotes.toLocaleString()}
      </p>
    </div>
  );
}

const MARGIN_PARTY_FILTERS: May2026MarginPartyFilter[] = ["All", "TVK", "AIADMK", "DMK"];

function formatMarginCompact(value: number): string {
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1000) return `${Math.round(value / 1000)}k`;
  return value.toLocaleString();
}

function marginMetricAccent(metric: May2026MarginMetric): { stroke: string; fill: string } {
  switch (metric) {
    case "close-win":
      return { stroke: "#059669", fill: "#059669" };
    case "close-loss":
      return { stroke: "#d97706", fill: "#d97706" };
    case "biggest-loss":
      return { stroke: "#e11d48", fill: "#e11d48" };
    default:
      return { stroke: "#6366f1", fill: "#6366f1" };
  }
}

function MarginPartyFilterTabs({
  value,
  onChange,
}: {
  value: May2026MarginPartyFilter;
  onChange: (party: May2026MarginPartyFilter) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1" role="tablist" aria-label="Filter by party">
      {MARGIN_PARTY_FILTERS.map((party) => {
        const isActive = value === party;
        return (
          <button
            key={party}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(party)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {party}
          </button>
        );
      })}
    </div>
  );
}

function MarginRaceLineChart({
  races,
  metric,
}: {
  races: May2026CloseRaceRow[];
  metric: May2026MarginMetric;
}) {
  const isLossView = metric === "biggest-loss" || metric === "close-loss";
  const accent = marginMetricAccent(metric);
  const maxMargin = Math.max(...races.map((race) => race.margin), 1);
  const gradientId = `margin-area-${metric}`;

  const layout = useMemo(() => {
    const width = 400;
    const height = 132;
    const padLeft = 40;
    const padRight = 12;
    const padTop = 10;
    const padBottom = 22;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;
    const count = races.length;

    const points = races.map((race, index) => {
      const focusParty = isLossView ? race.runnerParty : race.leaderParty;
      const t = count <= 1 ? 0.5 : index / (count - 1);
      const x = padLeft + t * chartW;
      const y = padTop + chartH - (race.margin / maxMargin) * chartH;
      return { race, focusParty, x, y, index };
    });

    const linePath =
      points.length > 0
        ? points.map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
        : "";

    const baselineY = padTop + chartH;
    const areaPath =
      points.length > 0
        ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
        : "";

    const yTicks = [0, maxMargin / 2, maxMargin];
    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      chartH,
      points,
      linePath,
      areaPath,
      yTicks,
      maxMargin,
      baselineY,
    };
  }, [races, isLossView, maxMargin]);

  return (
    <div className="rounded-lg border border-border/60 bg-gradient-to-b from-muted/25 to-transparent p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Margin trend · rank 1 → {races.length}
      </p>
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Victory margin line chart by rank"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent.fill} stopOpacity={0.35} />
            <stop offset="100%" stopColor={accent.fill} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {layout.yTicks.map((tick) => {
          const y = layout.padTop + layout.chartH - (tick / layout.maxMargin) * layout.chartH;
          return (
            <g key={tick}>
              <line
                x1={layout.padLeft}
                y1={y}
                x2={layout.width - layout.padRight}
                y2={y}
                className="stroke-border/40"
                strokeWidth={1}
              />
              <text
                x={layout.padLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[8px] tabular-nums"
              >
                {formatMarginCompact(tick)}
              </text>
            </g>
          );
        })}
        {layout.areaPath ? <path d={layout.areaPath} fill={`url(#${gradientId})`} /> : null}
        {layout.linePath ? (
          <path
            d={layout.linePath}
            fill="none"
            stroke={accent.stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {layout.points.map(({ race, focusParty, x, y, index }) => (
          <g key={race.acNumber}>
            <title>
              #{index + 1} {race.constituencyName}: {race.margin.toLocaleString()} votes (
              {race.marginPct.toFixed(1)}%)
            </title>
            <circle cx={x} cy={y} r={5} fill={getPartyFillColor(focusParty)} stroke="white" strokeWidth={1.5} />
          </g>
        ))}
        <text
          x={layout.padLeft}
          y={layout.height - 4}
          className="fill-muted-foreground text-[8px]"
        >
          Rank
        </text>
        <text
          x={layout.width - layout.padRight}
          y={layout.height - 4}
          textAnchor="end"
          className="fill-muted-foreground text-[8px]"
        >
          #{races.length}
        </text>
      </svg>
    </div>
  );
}

function MarginRaceLeaderboard({
  races,
  metric,
}: {
  races: May2026CloseRaceRow[];
  metric: May2026MarginMetric;
}) {
  const isLossView = metric === "biggest-loss" || metric === "close-loss";
  const maxMargin = Math.max(...races.map((race) => race.margin), 1);

  return (
    <ul className="mt-3 space-y-2">
      {races.map((race, index) => {
        const focusParty = isLossView ? race.runnerParty : race.leaderParty;
        const flagUrl = getPartyFlagUrl(focusParty);
        const accent = getPartyFillColor(focusParty);
        const muted = getPartyFillColorMuted(focusParty);
        const widthPct = Math.max(8, (race.margin / maxMargin) * 100);

        return (
          <li
            key={race.acNumber}
            className="relative overflow-hidden rounded-lg border border-border/60 bg-card/80 shadow-sm"
          >
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <div
              className="absolute inset-y-2 left-1.5 right-2 rounded-md opacity-100"
              style={{
                width: `calc(${widthPct}% - 0.5rem)`,
                maxWidth: "100%",
                background: `linear-gradient(90deg, ${muted} 0%, transparent 100%)`,
              }}
              aria-hidden
            />
            <div className="relative flex items-start gap-2.5 px-3 py-2.5 pl-3.5">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground"
              >
                {index + 1}
              </span>
              {flagUrl ? (
                <img
                  src={flagUrl}
                  alt=""
                  className="mt-0.5 h-5 w-8 shrink-0 rounded border border-border/60 object-cover shadow-sm"
                />
              ) : (
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="text-sm font-semibold leading-tight">{race.constituencyName}</span>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal tabular-nums">
                    AC {race.acNumber}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {isLossView ? (
                    <>
                      <span className="font-medium text-foreground">{race.runnerName}</span>
                      <span className="text-foreground/80"> ({race.runnerParty})</span>
                      {" · lost to "}
                      <span className="font-medium text-foreground">{race.leaderParty}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-foreground">{race.leaderName}</span>
                      <span className="text-foreground/80"> ({race.leaderParty})</span>
                      {" · beat "}
                      <span className="font-medium text-foreground">{race.runnerParty}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums tracking-tight">
                  {race.margin.toLocaleString()}
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {race.marginPct.toFixed(1)}% margin
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MarginRaceVisualization({
  races,
  metric,
}: {
  races: May2026CloseRaceRow[];
  metric: May2026MarginMetric;
}) {
  return (
    <div>
      <MarginRaceLineChart races={races} metric={metric} />
      <MarginRaceLeaderboard races={races} metric={metric} />
    </div>
  );
}

function May2026MarginWidget({
  title,
  description,
  metric,
}: {
  title: string;
  description: string;
  metric: May2026MarginMetric;
}) {
  const { data, loading, error } = useMay2026Analytics();
  const [partyFilter, setPartyFilter] = useState<May2026MarginPartyFilter>("All");

  return (
    <DashboardWidgetCard title={title} description={description} viewAllTo="/election-results">
      <AnalyticsShell analytics={data} loading={loading} error={error}>
        {(analytics) => {
          const races = selectMarginRaces(analytics.marginRaces, metric, partyFilter);
          return (
            <>
              <MarginPartyFilterTabs value={partyFilter} onChange={setPartyFilter} />
              {races.length === 0 ? (
                <DashboardEmptyState
                  message={`No constituencies match “${partyFilter}” for this chart.`}
                />
              ) : (
                <MarginRaceVisualization races={races} metric={metric} />
              )}
            </>
          );
        }}
      </AnalyticsShell>
    </DashboardWidgetCard>
  );
}

function PartyBarRow({
  party,
  value,
  maxValue,
  suffix,
}: {
  party: string;
  value: number;
  maxValue: number;
  suffix: string;
}) {
  const flagUrl = getPartyFlagUrl(party);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex min-w-0 items-center gap-2">
          {flagUrl ? (
            <img
              src={flagUrl}
              alt=""
              className="h-5 w-8 shrink-0 rounded border border-border/60 object-cover"
            />
          ) : null}
          <span className="truncate font-medium">{party}</span>
        </span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {value.toLocaleString()}{suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary/80"
          style={{ width: `${Math.max(6, (value / maxValue) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function AnalyticsShell({
  analytics,
  loading,
  error,
  children,
}: {
  analytics: May2026DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  children: (data: May2026DashboardAnalytics) => ReactNode;
}) {
  if (loading) return <PageLoading label="Loading May 2026 results…" className="min-h-[10rem] border-0" />;
  if (error) return <DashboardEmptyState message={error} />;
  if (!analytics || analytics.constituencyCount === 0) {
    return (
      <DashboardEmptyState
        message="No May 2026 results in the repo yet. Run python TN-Election-Results/import_roundwise_once.py"
      />
    );
  }
  return children(analytics);
}

export function May2026ElectionSnapshotWidget() {
  const { data, loading, error } = useMay2026Analytics();

  return (
    <DashboardWidgetCard
      title="May 2026 snapshot"
      description="Assembly election overview from ECI round-wise data"
      viewAllTo="/election-results"
    >
      <AnalyticsShell analytics={data} loading={loading} error={error}>
        {(analytics) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Landmark className="h-4 w-4 text-primary" />
                Constituencies
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{analytics.constituencyCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Avg {analytics.averageFinalRounds.toFixed(1)} EVM rounds completed
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-primary" />
                Leading bloc
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {analytics.partySeats[0]?.seats ?? "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {analytics.leadingParty ?? "—"} seats · majority needs {analytics.majoritySeats}
              </p>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/30 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Vote className="h-4 w-4 text-primary" />
                Vote share leader
              </div>
              <p className="mt-2 text-lg font-bold">
                {analytics.partyVotes[0]
                  ? `${analytics.partyVotes[0].party} · ${analytics.partyVotes[0].share.toFixed(1)}%`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Aggregated EVM totals (final round) across all candidates
              </p>
            </div>
          </div>
        )}
      </AnalyticsShell>
    </DashboardWidgetCard>
  );
}

export function May2026PartySeatsWidget() {
  const { data, loading, error } = useMay2026Analytics();
  const rows = data?.partySeats.slice(0, 8) ?? [];
  const maxSeats = Math.max(...rows.map((entry) => entry.seats), 1);

  return (
    <DashboardWidgetCard
      title="May 2026 seats by party"
      description="Projected winners after final EVM round (ECI)"
      viewAllTo="/election-results"
    >
      <AnalyticsShell analytics={data} loading={loading} error={error}>
        {() => (
          <div className="space-y-2">
            {rows.map((entry) => (
              <PartyBarRow
                key={entry.party}
                party={entry.party}
                value={entry.seats}
                maxValue={maxSeats}
                suffix=""
              />
            ))}
          </div>
        )}
      </AnalyticsShell>
    </DashboardWidgetCard>
  );
}

export function May2026VoteShareWidget() {
  const { data, loading, error } = useMay2026Analytics();
  const rows = data?.partyVotes.slice(0, 7) ?? [];
  const maxShare = Math.max(...rows.map((entry) => entry.share), 1);

  return (
    <DashboardWidgetCard
      title="May 2026 vote share"
      description="Share of all EVM votes tallied in the final round"
      viewAllTo="/election-results"
    >
      <AnalyticsShell analytics={data} loading={loading} error={error}>
        {() => (
          <div className="space-y-2">
            {rows.map((entry) => (
              <PartyBarRow
                key={entry.party}
                party={entry.party}
                value={Number(entry.share.toFixed(1))}
                maxValue={maxShare}
                suffix="%"
              />
            ))}
          </div>
        )}
      </AnalyticsShell>
    </DashboardWidgetCard>
  );
}

export function May2026BiggestWinsWidget() {
  return (
    <May2026MarginWidget
      title="Biggest wins"
      description="Largest victory margins in May 2026 (winner view)"
      metric="biggest-win"
    />
  );
}

export function May2026CloseWinsWidget() {
  return (
    <May2026MarginWidget
      title="Close wins"
      description="Narrowest victories — constituencies decided by the fewest votes"
      metric="close-win"
    />
  );
}

export function May2026BiggestLossesWidget() {
  return (
    <May2026MarginWidget
      title="Biggest losses"
      description="Runners-up defeated by the largest vote gaps (final round)"
      metric="biggest-loss"
    />
  );
}

export function May2026CloseLossesWidget() {
  return (
    <May2026MarginWidget
      title="Close losses"
      description="Runners-up who narrowly missed winning"
      metric="close-loss"
    />
  );
}

export function May2026TvKWinsWidget() {
  const { data, loading, error } = useMay2026Analytics();

  return (
    <DashboardWidgetCard
      title="TVK highlights"
      description="Tamilaga Vettri Kazhagam wins and strong shows"
      viewAllTo="/election-results"
    >
      <AnalyticsShell analytics={data} loading={loading} error={error}>
        {(analytics) => {
          const wins = analytics.tvkHighlights.filter((row) => row.won);
          const others = analytics.tvkHighlights.filter((row) => !row.won);
          const list = wins.length > 0 ? wins : others.slice(0, 5);
          if (list.length === 0) {
            return <DashboardEmptyState message="No TVK candidates in the imported results." />;
          }
          return (
            <ul className="space-y-2">
              {list.map((row) => (
                <li
                  key={row.acNumber}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.constituencyName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.candidateName}
                      {row.district ? ` · ${row.district}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {row.won ? (
                      <Badge className="mb-0.5 bg-primary/15 text-primary">Won</Badge>
                    ) : null}
                    <p className="text-xs font-semibold tabular-nums">{row.votes.toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          );
        }}
      </AnalyticsShell>
    </DashboardWidgetCard>
  );
}

export function Bye2026VsMayComparisonWidget() {
  const { data, loading, error } = useByeVsMayComparisons();

  return (
    <DashboardWidgetCard
      title="Bye-election vs May general (AC 35 & 101)"
      description="Party vote share in Madurantakam and Dharapuram — final ECI round"
      viewAllTo="/election-results"
      className="xl:col-span-2"
    >
      {loading ? (
        <PageLoading label="Loading bye vs general comparison…" className="min-h-[12rem] border-0" />
      ) : error ? (
        <DashboardEmptyState message={error} />
      ) : !data || data.length === 0 ? (
        <DashboardEmptyState
          message="Bye or May 2026 results missing. Run import_bye_roundwise_once.py and import_roundwise_once.py"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((comparison) => (
            <AcByeVsMayChart key={comparison.acNumber} comparison={comparison} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
