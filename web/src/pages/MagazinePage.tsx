import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";
import { useMemo } from "react";

import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useMagazineSearch } from "@/context/MagazineSearchContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Magazine } from "@/types/database";

async function fetchMagazines(): Promise<Magazine[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabase()
    .from("magazine")
    .select("*")
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Magazine[];
}

function formatIssueDate(value: string): string {
  return format(parseISO(value.includes("T") ? value : `${value}T00:00:00`), "MMMM yyyy");
}

function matchesSearch(magazine: Magazine, query: string): boolean {
  const haystack = [magazine.name, formatIssueDate(magazine.issue_date), magazine.issue_date]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function MagazineTile({ magazine }: { magazine: Magazine }) {
  return (
    <a
      href={magazine.url}
      target="_blank"
      rel="noreferrer"
      className="group overflow-hidden rounded-md border border-border bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md"
      title={magazine.name}
    >
      <div className="flex h-20 flex-col items-center justify-center gap-1.5 bg-muted px-2">
        <div className="rounded-md bg-primary/10 p-2 text-primary transition group-hover:bg-primary/15">
          <FileText className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          PDF
        </span>
      </div>
      <div className="space-y-0.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground group-hover:text-primary">
          {magazine.name}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatIssueDate(magazine.issue_date)}
        </p>
      </div>
    </a>
  );
}

export function MagazinePage() {
  const { data, loading, error } = useAsyncData(fetchMagazines, []);
  const magazineSearch = useMagazineSearch();
  const search = magazineSearch?.search ?? "";

  const magazines = data ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return magazines;
    return magazines.filter((magazine) => matchesSearch(magazine, query));
  }, [magazines, search]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  if (magazines.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No magazines found. Run the Tamil Digital Library sync to load Tamil Arasu issues.
      </p>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No magazines match your search.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {filtered.map((magazine) => (
        <MagazineTile key={magazine.id} magazine={magazine} />
      ))}
    </div>
  );
}
