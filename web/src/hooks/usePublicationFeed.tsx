import { useState, type ReactNode } from "react";

import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";

type UsePublicationFeedOptions<T> = {
  label?: string;
  load: () => Promise<unknown>;
  select: () => T;
};

function hasContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

export function usePublicationFeed<T>({
  load,
  select,
}: UsePublicationFeedOptions<T>): {
  data: T;
  loading: boolean;
  error: string | null;
  ready: boolean;
} {
  const query = useAsyncData(load, []);
  const data = select();
  // Feeds are cached per session. If the data is already here (revisit, or it was
  // prefetched on hover), render it straight away instead of flashing a spinner
  // while the (instant) load promise settles.
  const [cachedAtMount] = useState(() => hasContent(data));
  const loading = query.loading && !cachedAtMount;

  return {
    data,
    loading,
    error: query.error,
    ready: !loading && !query.error,
  };
}

export function PublicationFeedGate({
  loading,
  error,
  label,
  children,
}: {
  loading: boolean;
  error: string | null;
  label?: string;
  children: ReactNode;
}) {
  if (loading) {
    return <PageLoading className="flex-1" label={label ?? "Loading data…"} />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  return <>{children}</>;
}
