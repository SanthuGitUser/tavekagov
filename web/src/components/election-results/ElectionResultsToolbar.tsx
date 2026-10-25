import { ExternalLink } from "lucide-react";

import {
  ElectionResultsViewTabs,
  type ElectionResultsViewTab,
} from "@/components/election-results/ElectionResultsViewTabs";
import { Badge } from "@/components/ui/badge";
import { partyCodeFromEciName } from "@/lib/electionResultsUtils";
import { getPartyFlagUrl } from "@/lib/partyFlagUtils";
import type { TnElectionResultsFeedData } from "@/lib/tamilNaduElectionResultsFeed";
import { cn } from "@/lib/utils";

function formatFetchedAtShort(value: string): string {
  const datePart = value.slice(0, 10);
  return datePart.length === 10 ? datePart : value;
}

type ElectionResultsToolbarProps = {
  activeTab: ElectionResultsViewTab;
  onTabChange: (tab: ElectionResultsViewTab) => void;
  feed: TnElectionResultsFeedData | null;
  expectedConstituencyTotal: number | null;
  partySeats: [string, number][];
  className?: string;
};

export function ElectionResultsToolbar({
  activeTab,
  onTabChange,
  feed,
  expectedConstituencyTotal,
  partySeats,
  className,
}: ElectionResultsToolbarProps) {
  const constituencySummary =
    feed && expectedConstituencyTotal !== null
      ? `${feed.constituencyCount}/${expectedConstituencyTotal} ACs`
      : feed
        ? `${feed.constituencyCount} ACs`
        : null;

  return (
    <div className={cn("flex shrink-0 flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <ElectionResultsViewTabs activeTab={activeTab} onTabChange={onTabChange} />
        {feed ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {constituencySummary ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                {constituencySummary}
              </Badge>
            ) : null}
            {feed.fetchedAt ? (
              <span className="whitespace-nowrap" title={feed.fetchedAt}>
                Fetched {formatFetchedAtShort(feed.fetchedAt)}
              </span>
            ) : null}
            <a
              href={feed.sourceBase}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 whitespace-nowrap text-primary hover:underline"
            >
              ECI
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </div>
      {partySeats.length > 0 ? (
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Seats by leading party in final round"
        >
          {partySeats.map(([party, seats]) => {
            const code = partyCodeFromEciName(party);
            const flagUrl = getPartyFlagUrl(code);
            return (
              <div
                key={party}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-border/80 bg-muted/30 px-1.5 py-0.5"
              >
                {flagUrl ? (
                  <img src={flagUrl} alt="" className="h-3.5 w-5 rounded-sm border border-border/60 object-cover" />
                ) : null}
                <span className="text-[10px] font-semibold">{code}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">{seats}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
