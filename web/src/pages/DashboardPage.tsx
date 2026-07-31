import { type ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ArrowRightLeft,
  Building2,
  FileText,
  Gavel,
  MapPin,
  Users,
} from "lucide-react";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { DataTable } from "@/components/data/DataTable";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  fetchDashboardStats,
  fetchMonthlyCounts,
  fetchRecentPressReleases,
} from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import type { PressRelease } from "@/types/database";

const recentColumns: ColumnDef<PressRelease>[] = [
  {
    accessorKey: "pr_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.pr_date),
  },
  {
    accessorKey: "name",
    header: "Title",
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-xl">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "dipr_pr_no",
    header: "PR No.",
    cell: ({ row }) => row.original.dipr_pr_no ?? "—",
  },
  {
    id: "pdf",
    header: "",
    cell: ({ row }) => (
      <a
        href={row.original.pdf_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        PDF <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ),
  },
];

export function DashboardPage() {
  const statsQuery = useAsyncData(fetchDashboardStats, []);
  const chartQuery = useAsyncData(fetchMonthlyCounts, []);
  const recentQuery = useAsyncData(() => fetchRecentPressReleases(8), []);

  const loading = statsQuery.loading || chartQuery.loading;

  return (
    <div className="space-y-6">
      {statsQuery.error ? <ErrorState message={statsQuery.error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Press releases"
          value={statsQuery.data?.pressReleases ?? 0}
          icon={FileText}
          loading={loading}
        />
        <StatCard
          title="Departments"
          value={statsQuery.data?.departments ?? 0}
          icon={Building2}
          loading={loading}
        />
        <StatCard
          title="Ministers"
          value={statsQuery.data?.ministers ?? 0}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Districts"
          value={statsQuery.data?.districts ?? 0}
          icon={MapPin}
          loading={loading}
        />
        <StatCard
          title="Government orders"
          value={statsQuery.data?.governmentOrders ?? 0}
          icon={Gavel}
          loading={loading}
        />
        <StatCard
          title="Transfers and postings"
          value={statsQuery.data?.transfersPostings ?? 0}
          icon={ArrowRightLeft}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ActivityChart data={chartQuery.data ?? []} loading={chartQuery.loading} />
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/press-releases">Search press releases</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/gov-press-releases">Browse press release images</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/government-orders">View government orders</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent press releases</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/press-releases">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentQuery.loading ? (
            <Skeleton className="h-48 w-full" />
          ) : recentQuery.error ? (
            <ErrorState message={recentQuery.error} />
          ) : (
            <DataTable
              columns={recentColumns}
              data={recentQuery.data ?? []}
              searchColumn="name"
              pageSize={5}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
