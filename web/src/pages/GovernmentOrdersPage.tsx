import { GovernmentOrdersTimeline } from "@/components/government-orders/GovernmentOrdersTimeline";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { TnGoDept } from "@/types/database";
import type { TnDept, TnMinister } from "@/types/database";

type GovernmentOrdersPageData = {
  orders: TnGoDept[];
  deptByEncoded: Record<string, TnDept>;
  ministersByKey: Record<string, TnMinister>;
};

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function fetchGovernmentOrdersPageData(): Promise<GovernmentOrdersPageData> {
  if (!isSupabaseConfigured) return { orders: [], deptByEncoded: {}, ministersByKey: {} };

  const supabase = getSupabase();
  const [ordersResult, deptResult, ministersResult] = await Promise.all([
    supabase
      .from("tn_go_dept")
      .select("*")
      .order("go_date", { ascending: false })
      .limit(500),
    supabase.from("tn_dept").select("*").order("display_order", { ascending: true }),
    supabase.from("tn_ministers").select("*").order("display_order", { ascending: true }),
  ]);

  if (ordersResult.error) throw ordersResult.error;
  if (deptResult.error) throw deptResult.error;
  if (ministersResult.error) throw ministersResult.error;

  const orders = (ordersResult.data ?? []) as TnGoDept[];
  const depts = (deptResult.data ?? []) as TnDept[];
  const ministers = (ministersResult.data ?? []) as TnMinister[];

  const deptByEncoded = Object.fromEntries(
    depts.map((dept) => [dept.dep_id_encoded, dept]),
  );

  const ministersByKey = Object.fromEntries(
    ministers.map((minister) => [normalizeKey(minister.name), minister]),
  );

  return { orders, deptByEncoded, ministersByKey };
}

export function GovernmentOrdersPage() {
  const { data, loading, error } = useAsyncData(fetchGovernmentOrdersPageData, []);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row">
        <Skeleton className="h-56 w-[128px] shrink-0 rounded-lg" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GovernmentOrdersTimeline
        orders={data?.orders ?? []}
        deptByEncoded={data?.deptByEncoded ?? {}}
        ministersByKey={data?.ministersByKey ?? {}}
      />
    </div>
  );
}
