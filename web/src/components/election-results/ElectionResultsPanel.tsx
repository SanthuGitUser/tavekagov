import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ElectionForm20BoothPanel } from "@/components/election-results/ElectionForm20BoothPanel";
import { ElectionRoundSlider } from "@/components/election-results/ElectionRoundSlider";
import type { ElectionResultsViewTab } from "@/components/election-results/ElectionResultsViewTabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getFinalRound,
  getLeadingCandidate,
  getRoundCandidatesSorted,
  partyCodeFromEciName,
} from "@/lib/electionResultsUtils";
import { getPartyFlagUrl } from "@/lib/partyFlagUtils";
import type { TnElectionConstituencyResult, TnElectionResultsFeedData } from "@/lib/tamilNaduElectionResultsFeed";
import { tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { PageLoading } from "@/components/shared/PageLoading";
import { cn } from "@/lib/utils";

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PartyChip({ party }: { party: string }) {
  const code = partyCodeFromEciName(party);
  const flagUrl = getPartyFlagUrl(code);

  return (
    <Badge variant="outline" className="gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold">
      {flagUrl ? (
        <img src={flagUrl} alt="" className="h-4 w-6 rounded-sm border border-border/60 object-cover" />
      ) : null}
      <span>{code}</span>
    </Badge>
  );
}

function ConstituencyListItem({
  acNumber,
  name,
  district,
  leaderParty,
  selected,
  onSelect,
}: {
  acNumber: number;
  name: string;
  district: string | null;
  leaderParty: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/70 hover:border-primary/30 hover:bg-accent/30",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight">{name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          AC {acNumber}
          {district ? ` · ${district}` : ""}
        </p>
      </div>
      {leaderParty ? <PartyChip party={leaderParty} /> : null}
    </button>
  );
}

type ResultsDetailView = "rounds" | "booths";

type ElectionResultsPanelProps = {
  feed: TnElectionResultsFeedData | null;
  loadError: string | null;
  emptyImportCommand: string;
  electionTab: ElectionResultsViewTab;
};

export function ElectionResultsPanel({
  feed,
  loadError,
  emptyImportCommand,
  electionTab,
}: ElectionResultsPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedAc, setSelectedAc] = useState<number | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [detailView, setDetailView] = useState<ResultsDetailView>("rounds");

  useEffect(() => {
    if (feed && feed.results.length > 0) {
      setSelectedAc(feed.results[0]?.ac_number ?? null);
      setSearch("");
      setRoundNumber(1);
    }
    setDetailView("rounds");
  }, [feed?.electionId]);

  const constituencyMeta = useMemo(() => {
    const map = new Map(
      tamilNaduAssemblyConstituenciesFeed.constituencies.map((row) => [row.ac_number, row]),
    );
    return map;
  }, []);

  const filteredResults = useMemo(() => {
    if (!feed) return [];
    const query = search.trim().toLowerCase();
    if (!query) return feed.results;
    return feed.results.filter((result) => {
      const meta = constituencyMeta.get(result.ac_number);
      const name = meta?.name?.toLowerCase() ?? "";
      const district = meta?.district?.toLowerCase() ?? "";
      const ac = String(result.ac_number);
      return name.includes(query) || district.includes(query) || ac.includes(query);
    });
  }, [feed, search, constituencyMeta]);

  const selectedResult: TnElectionConstituencyResult | null = useMemo(() => {
    if (!feed || selectedAc === null) return null;
    return feed.results.find((row) => row.ac_number === selectedAc) ?? null;
  }, [feed, selectedAc]);

  const finalRound = selectedResult ? getFinalRound(selectedResult) : null;

  useEffect(() => {
    if (finalRound) setRoundNumber(finalRound.round);
  }, [selectedResult?.ac_number, finalRound?.round]);

  const roundData = useMemo(() => {
    if (!selectedResult) return null;
    const exact = selectedResult.rounds.find((row) => row.round === roundNumber);
    if (exact) return exact;
    return getFinalRound(selectedResult);
  }, [selectedResult, roundNumber]);

  if (loadError) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">{loadError}</CardContent>
      </Card>
    );
  }

  if (!feed) {
    return <PageLoading label="Loading election results…" />;
  }

  if (feed.results.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-2 p-8 text-center text-sm text-muted-foreground">
          <p>No election results in the repository yet.</p>
          <p>
            Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{emptyImportCommand}</code> to import
            round-wise counts from ECI.
          </p>
        </CardContent>
      </Card>
    );
  }

  const meta = selectedAc !== null ? constituencyMeta.get(selectedAc) : undefined;
  const displayName = meta ? toTitleCase(meta.name) : `AC ${selectedAc ?? ""}`;
  const candidates = getRoundCandidatesSorted(roundData);
  const form20Election = electionTab === "bye-2026" ? "bye" : "may";

  return (
    <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,240px)_1fr]">
        <div className="flex min-h-0 flex-col gap-1.5">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search AC, name, district…"
            aria-label="Search constituencies"
            className="h-8 text-sm"
          />
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
            {filteredResults.map((result) => {
              const rowMeta = constituencyMeta.get(result.ac_number);
              const final = getFinalRound(result);
              const leader = final ? getLeadingCandidate(result, final.round) : null;
              return (
                <ConstituencyListItem
                  key={result.ac_number}
                  acNumber={result.ac_number}
                  name={rowMeta ? toTitleCase(rowMeta.name) : `AC ${result.ac_number}`}
                  district={rowMeta?.district ?? null}
                  leaderParty={leader?.party ?? null}
                  selected={selectedAc === result.ac_number}
                  onSelect={() => setSelectedAc(result.ac_number)}
                />
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden py-0">
            <CardContent className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
              {selectedResult ? (
                <>
                  <div className="flex shrink-0 flex-wrap items-center justify-between gap-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 text-sm">
                      <h2 className="text-base font-semibold leading-tight">{displayName}</h2>
                      {meta?.district ? (
                        <>
                          <span className="text-muted-foreground" aria-hidden>·</span>
                          <span className="text-muted-foreground">{meta.district}</span>
                        </>
                      ) : null}
                      <span className="text-muted-foreground" aria-hidden>·</span>
                      <span className="text-xs text-muted-foreground">
                        EVM rounds: {selectedResult.evm_round_status ?? selectedResult.total_rounds}
                      </span>
                    </div>
                    <a
                      href={selectedResult.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Source page
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                <div className="flex shrink-0 gap-1" role="tablist" aria-label="Result detail view">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailView === "rounds"}
                    onClick={() => setDetailView("rounds")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium",
                      detailView === "rounds"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    Round-wise (ECI)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailView === "booths"}
                    onClick={() => setDetailView("booths")}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium",
                      detailView === "booths"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    Booth-wise (Form 20)
                  </button>
                </div>

                {detailView === "booths" ? (
                  <ElectionForm20BoothPanel
                    acNumber={selectedResult.ac_number}
                    election={form20Election}
                  />
                ) : null}

                {detailView === "rounds" && selectedResult.total_rounds > 1 ? (
                    <div className="shrink-0">
                      <ElectionRoundSlider
                        round={roundNumber}
                        totalRounds={selectedResult.total_rounds}
                        onRoundChange={setRoundNumber}
                      />
                    </div>
                ) : null}

                {detailView === "rounds" ? (
                <div
                    className="min-h-[12rem] flex-1 overflow-x-auto overflow-y-auto overscroll-contain rounded-md border"
                    role="region"
                    aria-label="Candidate vote counts"
                  >
                    <table className="w-full min-w-[32rem] text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-muted text-xs uppercase text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
                        <tr>
                          <th className="px-3 py-2 font-medium">Candidate</th>
                          <th className="px-3 py-2 font-medium">Party</th>
                          <th className="px-3 py-2 font-medium text-right">Brought fwd</th>
                          <th className="px-3 py-2 font-medium text-right">This round</th>
                          <th className="px-3 py-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((row) => (
                          <tr key={`${row.name}-${row.party}`} className="border-t border-border/60">
                            <td className="px-3 py-2 font-medium">{row.name}</td>
                            <td className="px-3 py-2">
                              <PartyChip party={row.party} />
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.brought_forward.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {row.current_round.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums font-semibold">
                              {row.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a constituency to view round-wise votes.</p>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
