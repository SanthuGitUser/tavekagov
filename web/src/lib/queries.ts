import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { DashboardStats, PressRelease } from "@/types/database";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured) {
    return {
      pressReleases: 0,
      departments: 0,
      ministers: 0,
      districts: 0,
      governmentOrders: 0,
      transfersPostings: 0,
    };
  }

  const supabase = getSupabase();
  const tables = [
    "tn_press_release",
    "tn_dept",
    "tn_ministers",
    "tn_districts",
    "tn_go_dept",
    "tn_transfers_postings",
  ] as const;

  const counts = await Promise.all(
    tables.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    }),
  );

  return {
    pressReleases: counts[0],
    departments: counts[1],
    ministers: counts[2],
    districts: counts[3],
    governmentOrders: counts[4],
    transfersPostings: counts[5],
  };
}

export async function fetchMonthlyCounts(): Promise<{ month: string; press: number }[]> {
  if (!isSupabaseConfigured) return [];

  const supabase = getSupabase();
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  const sinceIso = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("tn_press_release")
    .select("pr_date")
    .gte("pr_date", sinceIso)
    .order("pr_date", { ascending: true });

  if (error) throw error;

  const bucket = new Map<string, number>();

  for (const row of (data ?? []) as { pr_date: string }[]) {
    const month = row.pr_date.slice(0, 7);
    bucket.set(month, (bucket.get(month) ?? 0) + 1);
  }

  return [...bucket.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, press]) => ({ month, press }));
}

export async function fetchRecentPressReleases(
  limit = 8,
): Promise<PressRelease[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await getSupabase()
    .from("tn_press_release")
    .select("*")
    .order("pr_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PressRelease[];
}
