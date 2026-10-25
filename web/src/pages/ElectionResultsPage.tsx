import { useEffect, useMemo, useState } from "react";

import { ElectionResultsPanel } from "@/components/election-results/ElectionResultsPanel";
import { ElectionResultsToolbar } from "@/components/election-results/ElectionResultsToolbar";
import type { ElectionResultsViewTab } from "@/components/election-results/ElectionResultsViewTabs";
import { computePartySeatCounts } from "@/lib/electionResultsUtils";
import {
  loadTamilNaduElectionByeResultsFeed,
  loadTamilNaduElectionResultsFeed,
  type TnElectionResultsFeedData,
} from "@/lib/tamilNaduElectionResultsFeed";

export function ElectionResultsPage() {
  const [activeTab, setActiveTab] = useState<ElectionResultsViewTab>("may-2026");
  const [mayFeed, setMayFeed] = useState<TnElectionResultsFeedData | null>(null);
  const [byeFeed, setByeFeed] = useState<TnElectionResultsFeedData | null>(null);
  const [mayError, setMayError] = useState<string | null>(null);
  const [byeError, setByeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTamilNaduElectionResultsFeed()
      .then((data) => {
        if (!cancelled) setMayFeed(data);
      })
      .catch(() => {
        if (!cancelled) setMayError("Unable to load May 2026 election results.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "bye-2026" || byeFeed || byeError) return;

    let cancelled = false;
    loadTamilNaduElectionByeResultsFeed()
      .then((data) => {
        if (!cancelled) setByeFeed(data);
      })
      .catch(() => {
        if (!cancelled) setByeError("Unable to load bye-election results.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, byeFeed, byeError]);

  const isByeTab = activeTab === "bye-2026";
  const feed = isByeTab ? byeFeed : mayFeed;

  const partySeats = useMemo(
    () =>
      feed
        ? [...computePartySeatCounts(feed.results).entries()].sort((left, right) => right[1] - left[1])
        : [],
    [feed],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0 space-y-1 border-b border-border pb-2">
        <h1 className="text-lg font-bold leading-tight tracking-tight">Election Results</h1>
        <ElectionResultsToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          feed={feed}
          expectedConstituencyTotal={isByeTab ? 2 : 234}
          partySeats={partySeats}
        />
      </div>
      <ElectionResultsPanel
        feed={feed}
        electionTab={activeTab}
        loadError={isByeTab ? byeError : mayError}
        emptyImportCommand={
          isByeTab
            ? "python TN-Election-Results/import_bye_roundwise_once.py"
            : "python TN-Election-Results/import_roundwise_once.py"
        }
      />
    </div>
  );
}
