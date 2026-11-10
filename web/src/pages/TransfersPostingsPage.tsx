import { useEffect, useMemo } from "react";

import { isDateInNewsRange } from "@/components/news/NewsDatePicker";
import { TransfersPostingsTable } from "@/components/transfers-postings/TransfersPostingsTable";
import {
  PublicationFeedGate,
  usePublicationFeed,
} from "@/hooks/usePublicationFeed";
import { useTransfersPostingsSearch } from "@/context/TransfersPostingsSearchContext";
import { useLatestDateRange } from "@/hooks/useLatestDateRange";
import { ensureTransfersPostingsPageFeedsLoaded } from "@/lib/publicationFeedsLoader";
import {
  expandTransferPostingRows,
  getAvailableTransfersPostingDates,
  getDefaultTransfersPostingDateRange,
  getTransfersPostings,
} from "@/lib/tamilNaduTransfersPostingsFeed";
import type { TnTransfersPostingRow } from "@/types/models";

function matchesSearch(row: TnTransfersPostingRow, query: string): boolean {
  const haystack = [
    row.subject,
    row.go_number,
    row.go_date,
    row.officer_name,
    row.details,
    row.old_post,
    row.new_post,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function TransfersPostingsPage() {
  const feed = usePublicationFeed({
    load: ensureTransfersPostingsPageFeedsLoaded,
    select: () => getTransfersPostings(),
  });
  const transfersPostingsSearch = useTransfersPostingsSearch();
  const query = transfersPostingsSearch?.search.trim().toLowerCase() ?? "";
  const filterDateRange = transfersPostingsSearch?.filterDateRange ?? { from: "", to: "" };

  const allPostings = feed.data;
  const allRows = useMemo(() => expandTransferPostingRows(allPostings), [allPostings]);
  const availableDates = useMemo(() => getAvailableTransfersPostingDates(), [allPostings]);

  useEffect(() => {
    transfersPostingsSearch?.setAvailableDates(availableDates);
    transfersPostingsSearch?.setTotalCount(allRows.length);
  }, [allRows.length, availableDates, transfersPostingsSearch]);

  const defaultDateRange = useMemo(
    () => (availableDates.length > 0 ? getDefaultTransfersPostingDateRange(availableDates) : undefined),
    [availableDates],
  );
  useLatestDateRange(
    filterDateRange,
    transfersPostingsSearch?.setFilterDateRange,
    availableDates[0] ?? null,
    undefined,
    defaultDateRange,
  );

  const rows = useMemo(() => {
    let filtered = allRows;
    if (filterDateRange.from || filterDateRange.to) {
      filtered = filtered.filter((row) => isDateInNewsRange(row.go_date, filterDateRange));
    }
    if (query) {
      filtered = filtered.filter((row) => matchesSearch(row, query));
    }
    return filtered;
  }, [allRows, filterDateRange, query]);

  useEffect(() => {
    transfersPostingsSearch?.setFilteredCount(rows.length);
  }, [rows.length, transfersPostingsSearch]);

  return (
    <PublicationFeedGate loading={feed.loading} error={feed.error} label="Loading transfers and postings…">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TransfersPostingsTable rows={rows} />
      </div>
    </PublicationFeedGate>
  );
}
