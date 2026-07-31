import { useMemo } from "react";

import { TransfersPostingsTable } from "@/components/transfers-postings/TransfersPostingsTable";
import { useTransfersPostingsSearch } from "@/context/TransfersPostingsSearchContext";
import { getTransfersPostings } from "@/lib/tamilNaduTransfersPostingsFeed";
import type { TnTransfersPosting } from "@/types/models";

function matchesSearch(posting: TnTransfersPosting, query: string): boolean {
  const haystack = [posting.subject, posting.go_number, posting.go_date]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function TransfersPostingsPage() {
  const transfersPostingsSearch = useTransfersPostingsSearch();
  const query = transfersPostingsSearch?.search.trim().toLowerCase() ?? "";

  const postings = useMemo(() => {
    const rows = getTransfersPostings();
    if (!query) return rows;
    return rows.filter((posting) => matchesSearch(posting, query));
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TransfersPostingsTable postings={postings} />
    </div>
  );
}
