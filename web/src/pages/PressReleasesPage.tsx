import { PressReleaseTimeline } from "@/components/press-releases/PressReleaseTimeline";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/useAsyncData";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import type { PressRelease } from "@/types/database";
import type { TnMinister } from "@/types/database";

type PressReleasesPageData = {
  releases: PressRelease[];
  ministersById: Record<number, TnMinister>;
};

async function fetchPressReleasesPageData(): Promise<PressReleasesPageData> {
  if (!isSupabaseConfigured) return { releases: [], ministersById: {} };

  const supabase = getSupabase();
  const [pressResult, ministersResult] = await Promise.all([
    supabase
      .from("tn_press_release")
      .select("*")
      .order("pr_date", { ascending: false })
      .limit(500),
    supabase.from("tn_ministers").select("*").order("display_order", { ascending: true }),
  ]);

  if (pressResult.error) throw pressResult.error;
  if (ministersResult.error) throw ministersResult.error;

  const releases = (pressResult.data ?? []) as PressRelease[];
  const ministers = (ministersResult.data ?? []) as TnMinister[];
  const ministersById = Object.fromEntries(ministers.map((minister) => [minister.id, minister]));

  return { releases, ministersById };
}

export function PressReleasesPage() {
  const { data, loading, error } = useAsyncData(fetchPressReleasesPageData, []);

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
      <PressReleaseTimeline
        releases={data?.releases ?? []}
        ministersById={data?.ministersById ?? {}}
      />
    </div>
  );
}
