import { Landmark, Trophy, Vote } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

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
  type ByeVsMayAcComparison,
  type May2026DashboardAnalytics,
} from "@/lib/dashboardElectionWidgetData";
import { getPartyFlagUrl } from "@/lib/partyFlagUtils";

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

export function May2026CloseRacesWidget() {
  const { data, loading, error } = useMay2026Analytics();

  return (
    <DashboardWidgetCard
      title="Closest contests"
      description="Smallest victory margins (final EVM round)"
      viewAllTo="/election-results"
    >
      <AnalyticsShell analytics={data} loading={loading} error={error}>
        {(analytics) => (
          <ul className="space-y-2">
            {analytics.closeRaces.map((race) => (
              <li
                key={race.acNumber}
                className="rounded-md border border-border/70 bg-background/40 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      to="/election-results"
                      className="text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {race.constituencyName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      AC {race.acNumber}
                      {race.district ? ` · ${race.district}` : ""}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">
                    +{race.margin.toLocaleString()}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{race.leaderParty}</span>{" "}
                  {race.leaderName} ({race.leaderVotes.toLocaleString()}) vs{" "}
                  <span className="font-medium text-foreground">{race.runnerParty}</span>{" "}
                  {race.runnerName}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AnalyticsShell>
    </DashboardWidgetCard>
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
