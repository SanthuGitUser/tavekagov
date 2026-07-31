import { useMemo } from "react";

import { TransfersPostingsTable } from "@/components/transfers-postings/TransfersPostingsTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransfersPostingsSearch } from "@/context/TransfersPostingsSearchContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { TnTransfersPosting } from "@/types/database";

async function fetchTransfersPostings(): Promise<TnTransfersPosting[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase()
    .from("tn_transfers_postings")
    .select("*")
    .order("go_date", { ascending: false })
    .order("serial_number", { ascending: true })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as TnTransfersPosting[];
}

function matchesSearch(posting: TnTransfersPosting, query: string): boolean {
  const haystack = [posting.subject, posting.go_number, posting.go_date]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function TransfersPostingsPage() {
  const transfersPostingsSearch = useTransfersPostingsSearch();
  const { data, loading, error } = useAsyncData(fetchTransfersPostings, []);

  const query = transfersPostingsSearch?.search.trim().toLowerCase() ?? "";
  const postings = useMemo(() => {
    const rows = data ?? [];
    if (!query) return rows;
    return rows.filter((posting) => matchesSearch(posting, query));
  }, [data, query]);

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Skeleton className="h-full min-h-[420px] w-full rounded-xl" />
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TransfersPostingsTable postings={postings} />
    </div>
  );
}
