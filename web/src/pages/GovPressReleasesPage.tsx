import { GovPressReleaseTimeline } from "@/components/gov-press-releases/GovPressReleaseTimeline";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { GovPressRelease, TnDept, TnMinister } from "@/types/database";

type GovPressReleasesPageData = {
  releases: GovPressRelease[];
  departments: TnDept[];
  ministers: TnMinister[];
};

async function fetchGovPressReleasesPageData(): Promise<GovPressReleasesPageData> {
  if (!isSupabaseConfigured) {
    return { releases: [], departments: [], ministers: [] };
  }

  const supabase = getSupabase();
  const [releasesResult, departmentsResult, ministersResult] = await Promise.all([
    supabase
      .from("tn_gov_press_releases")
      .select("*")
      .order("release_date", { ascending: false })
      .limit(1000),
    supabase.from("tn_dept").select("*").order("display_order", { ascending: true }),
    supabase.from("tn_ministers").select("*").order("display_order", { ascending: true }),
  ]);

  if (releasesResult.error) throw releasesResult.error;
  if (departmentsResult.error) throw departmentsResult.error;
  if (ministersResult.error) throw ministersResult.error;

  return {
    releases: (releasesResult.data ?? []) as GovPressRelease[],
    departments: (departmentsResult.data ?? []) as TnDept[],
    ministers: (ministersResult.data ?? []) as TnMinister[],
  };
}

export function GovPressReleasesPage() {
  const { data, loading, error } = useAsyncData(fetchGovPressReleasesPageData, []);

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
      <GovPressReleaseTimeline
        releases={data?.releases ?? []}
        departments={data?.departments ?? []}
        ministers={data?.ministers ?? []}
      />
    </div>
  );
}
