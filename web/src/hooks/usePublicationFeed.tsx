import type { ReactNode } from "react";

import { PageLoading } from "@/components/shared/PageLoading";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAsyncData } from "@/hooks/useAsyncData";

type UsePublicationFeedOptions<T> = {
  label?: string;
  load: () => Promise<unknown>;
  select: () => T;
};

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

  return {
    data,
    loading: query.loading,
    error: query.error,
    ready: !query.loading && !query.error,
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
    return <PageLoading label={label ?? "Loading data…"} />;
  }
  if (error) {
    return <ErrorState message={error} />;
  }
  return <>{children}</>;
}
