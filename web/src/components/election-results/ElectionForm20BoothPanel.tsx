import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { PageLoading } from "@/components/shared/PageLoading";
import { Button } from "@/components/ui/button";
import {
  hasForm20ForAc,
  loadByeForm20Manifest,
  loadForm20ForAc,
  loadMayForm20Manifest,
  type TnForm20Booth,
  type TnForm20ConstituencyData,
} from "@/lib/tamilNaduElectionForm20Feed";
import { cn } from "@/lib/utils";

type ElectionForm20BoothPanelProps = {
  acNumber: number;
  election: "may" | "bye";
};

type BoothViewMode = "overview" | "matrix";

function leadingVoteIndex(votes: number[]): number {
  let bestIndex = -1;
  let bestValue = -1;
  for (let index = 0; index < votes.length; index += 1) {
    if (votes[index] > bestValue) {
      bestValue = votes[index];
      bestIndex = index;
    }
  }
  return bestIndex;
}

function abbrevCandidate(name: string, maxLen = 12): string {
  const compact = name.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, maxLen - 1)}…`;
}

function candidateHue(index: number, total: number): string {
  const step = total > 0 ? 360 / Math.max(total, 6) : 60;
  return `hsl(${(index * step) % 360} 58% 42%)`;
}

function boothCandidateRows(
  booth: TnForm20Booth,
  candidates: string[],
): Array<{ index: number; name: string; votes: number; share: number }> {
  const valid = booth.valid_votes > 0 ? booth.valid_votes : 1;
  return candidates
    .map((name, index) => ({
      index,
      name,
      votes: booth.votes[index] ?? 0,
      share: ((booth.votes[index] ?? 0) / valid) * 100,
    }))
    .filter((row) => row.votes > 0)
    .sort((a, b) => b.votes - a.votes);
}

function BoothVoteShareBar({
  booth,
  candidates,
  topN = 4,
}: {
  booth: TnForm20Booth;
  candidates: string[];
  topN?: number;
}) {
  const rows = boothCandidateRows(booth, candidates).slice(0, topN);
  const valid = booth.valid_votes > 0 ? booth.valid_votes : 1;

  if (rows.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-[8rem] flex-col gap-1">
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        title={rows.map((r) => `${r.name}: ${r.votes}`).join(" · ")}
      >
        {rows.map((row) => (
          <div
            key={row.index}
            className="h-full min-w-px"
            style={{
              width: `${(row.votes / valid) * 100}%`,
              backgroundColor: candidateHue(row.index, candidates.length),
            }}
          />
        ))}
      </div>
      <p className="truncate text-[10px] text-muted-foreground">
        {rows[0].name}
        {rows.length > 1 ? ` +${rows.length - 1}` : ""}
      </p>
    </div>
  );
}

function BoothExpandedCandidates({
  booth,
  candidates,
}: {
  booth: TnForm20Booth;
  candidates: string[];
}) {
  const rows = boothCandidateRows(booth, candidates);
  const maxVotes = rows[0]?.votes ?? 1;

  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {rows.map((row) => (
        <li key={row.index} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: candidateHue(row.index, candidates.length) }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate font-medium" title={row.name}>
            {row.name}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">{row.share.toFixed(1)}%</span>
          <span className="w-12 shrink-0 text-right tabular-nums font-medium">
            {row.votes.toLocaleString()}
          </span>
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(row.votes / maxVotes) * 100}%`,
                backgroundColor: candidateHue(row.index, candidates.length),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ElectionForm20BoothPanel({ acNumber, election }: ElectionForm20BoothPanelProps) {
  const [data, setData] = useState<TnForm20ConstituencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<BoothViewMode>("overview");
  const [expandedPs, setExpandedPs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    setExpandedPs(null);

    async function load() {
      const manifest =
        election === "bye" ? await loadByeForm20Manifest() : await loadMayForm20Manifest();
      if (!manifest || !hasForm20ForAc(manifest, acNumber)) {
        if (!cancelled) {
          setError(
            election === "bye"
              ? "Booth-wise Form 20 data is not imported for this constituency yet. Run python TN-Election-Results/import_form20_once.py --bye-only"
              : "Booth-wise Form 20 data is not imported for this constituency yet. Run python TN-Election-Results/import_form20_once.py",
          );
          setLoading(false);
        }
        return;
      }
      const row = await loadForm20ForAc(election, acNumber);
      if (cancelled) return;
      if (!row) {
        setError("Unable to load Form 20 booth data for this constituency.");
      } else {
        setData(row);
      }
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [acNumber, election]);

  const filteredBooths = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    if (!query) return data.booths;
    return data.booths.filter((booth) => {
      const serial = String(booth.polling_station_serial);
      const location = booth.location?.toLowerCase() ?? "";
      return serial.includes(query) || location.includes(query);
    });
  }, [data, search]);

  const columnTotals = useMemo(() => {
    if (!data) return [];
    return data.candidates.map((_, candidateIndex) =>
      data.booths.reduce((sum, booth) => sum + (booth.votes[candidateIndex] ?? 0), 0),
    );
  }, [data]);

  if (loading) {
    return <PageLoading label="Loading booth-wise Form 20…" className="min-h-[8rem] border-0" />;
  }

  if (error) {
    return (
      <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
        {error}
      </p>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {data.booth_count} polling stations · {data.candidates.length} candidates · Form 20 (
          {data.layout})
        </span>
        <a
          href={data.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          CEO TN PDF
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border p-0.5" role="tablist" aria-label="Booth data view">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "overview" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            role="tab"
            aria-selected={viewMode === "overview"}
            onClick={() => setViewMode("overview")}
          >
            Overview
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "matrix" ? "secondary" : "ghost"}
            className="h-7 px-2.5 text-xs"
            role="tab"
            aria-selected={viewMode === "matrix"}
            onClick={() => setViewMode("matrix")}
          >
            Full matrix
          </Button>
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search PS no. or location…"
          className={cn(
            "h-8 min-w-[12rem] flex-1 rounded-md border border-input bg-background px-2 text-sm",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          aria-label="Search polling stations"
        />
      </div>

      {viewMode === "overview" ? (
        <p className="text-[11px] text-muted-foreground">
          Tap a row to see every candidate&apos;s votes at that booth. Bars show the top vote shares.
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Scroll horizontally for all candidates (same layout as the PDF). Darker cells = more votes in
          that booth.
        </p>
      )}

      <div
        className="min-h-0 flex-1 overflow-auto rounded-md border"
        role="region"
        aria-label="Booth-wise vote counts"
      >
        {viewMode === "overview" ? (
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted text-[10px] uppercase text-muted-foreground shadow-[0_1px_0_0_hsl(var(--border))]">
              <tr>
                <th className="w-8 px-1 py-1.5" aria-hidden />
                <th className="px-2 py-1.5 font-medium">PS</th>
                <th className="px-2 py-1.5 font-medium">Location</th>
                <th className="min-w-[9rem] px-2 py-1.5 font-medium">Vote mix</th>
                <th className="px-2 py-1.5 font-medium text-right">Valid</th>
                <th className="px-2 py-1.5 font-medium text-right">NOTA</th>
                <th className="px-2 py-1.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooths.map((booth) => {
                const expanded = expandedPs === booth.polling_station_serial;
                const leadIndex = leadingVoteIndex(booth.votes);
                return (
                  <Fragment key={booth.polling_station_serial}>
                    <tr
                      className={cn(
                        "border-t border-border/60",
                        expanded && "bg-muted/25",
                      )}
                    >
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-expanded={expanded}
                          aria-label={`${expanded ? "Collapse" : "Expand"} booth ${booth.polling_station_serial}`}
                          onClick={() =>
                            setExpandedPs(expanded ? null : booth.polling_station_serial)
                          }
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-2 py-1.5 tabular-nums font-medium">
                        {booth.polling_station_serial}
                      </td>
                      <td className="max-w-[12rem] truncate px-2 py-1.5 text-xs text-muted-foreground">
                        {booth.location ?? "—"}
                      </td>
                      <td className="px-2 py-1.5">
                        <BoothVoteShareBar booth={booth} candidates={data.candidates} />
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {booth.valid_votes.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {booth.nota.toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                        {booth.total.toLocaleString()}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-t border-border/40 bg-muted/15">
                        <td colSpan={7} className="px-3 py-2">
                          {leadIndex >= 0 ? (
                            <p className="mb-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Booth {booth.polling_station_serial} · leading:{" "}
                              <span className="font-medium text-foreground">
                                {data.candidates[leadIndex]}
                              </span>
                            </p>
                          ) : null}
                          <BoothExpandedCandidates booth={booth} candidates={data.candidates} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase text-muted-foreground">
                <th
                  className="sticky left-0 top-0 z-20 border-b border-border bg-muted px-2 py-2 font-medium"
                >
                  PS
                </th>
                <th
                  className="sticky top-0 z-10 max-w-[10rem] border-b border-border bg-muted px-2 py-2 font-medium"
                >
                  Location
                </th>
                {data.candidates.map((name, index) => (
                  <th
                    key={`${name}-${index}`}
                    className="sticky top-0 z-10 border-b border-border bg-muted px-1 py-2 text-center font-medium"
                    title={name}
                  >
                    <span className="block max-w-[4.5rem] rotate-[-52deg] origin-bottom-left whitespace-nowrap text-[9px] normal-case leading-tight">
                      {abbrevCandidate(name, 14)}
                    </span>
                    <span className="sr-only">{name}</span>
                  </th>
                ))}
                <th className="sticky top-0 z-10 border-b border-border bg-muted px-2 py-2 text-right font-medium">
                  Valid
                </th>
                <th className="sticky top-0 z-10 border-b border-border bg-muted px-2 py-2 text-right font-medium">
                  NOTA
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBooths.map((booth) => {
                const leadIndex = leadingVoteIndex(booth.votes);
                const rowMax = Math.max(...booth.votes, 1);
                return (
                  <tr key={booth.polling_station_serial} className="border-t border-border/50">
                    <td
                      className="sticky left-0 z-10 border-b border-border/40 bg-background px-2 py-1 tabular-nums font-medium"
                    >
                      {booth.polling_station_serial}
                    </td>
                    <td className="max-w-[10rem] truncate border-b border-border/40 px-2 py-1 text-muted-foreground">
                      {booth.location ?? "—"}
                    </td>
                    {booth.votes.map((votes, index) => {
                      const intensity = votes > 0 ? 0.12 + 0.5 * (votes / rowMax) : 0;
                      const isLeader = index === leadIndex && votes > 0;
                      return (
                        <td
                          key={index}
                          className={cn(
                            "border-b border-border/40 px-1 py-1 text-center tabular-nums",
                            isLeader && "font-semibold ring-1 ring-inset ring-primary/40",
                          )}
                          style={{
                            backgroundColor: votes > 0
                              ? `hsl(var(--primary) / ${intensity})`
                              : undefined,
                          }}
                          title={`${data.candidates[index]}: ${votes.toLocaleString()}`}
                        >
                          {votes > 0 ? votes.toLocaleString() : "·"}
                        </td>
                      );
                    })}
                    <td className="border-b border-border/40 px-2 py-1 text-right tabular-nums">
                      {booth.valid_votes.toLocaleString()}
                    </td>
                    <td className="border-b border-border/40 px-2 py-1 text-right tabular-nums">
                      {booth.nota.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/50 text-[10px] font-semibold uppercase text-muted-foreground">
                <td className="sticky left-0 z-10 bg-muted/80 px-2 py-2" colSpan={2}>
                  AC total
                </td>
                {columnTotals.map((total, index) => (
                  <td key={index} className="px-1 py-2 text-center tabular-nums text-foreground">
                    {total.toLocaleString()}
                  </td>
                ))}
                <td className="px-2 py-2 text-right tabular-nums text-foreground">
                  {data.booths.reduce((s, b) => s + b.valid_votes, 0).toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-foreground">
                  {data.booths.reduce((s, b) => s + b.nota, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
