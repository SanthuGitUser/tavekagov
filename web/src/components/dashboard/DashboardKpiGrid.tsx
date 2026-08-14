import {
  ArrowRightLeft,
  BookOpen,
  Building2,
  FileText,
  Gavel,
  Image,
  Landmark,
  Map,
  MapPin,
  Newspaper,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard";
import type { DashboardStats } from "@/types/models";

type DashboardKpiGridProps = {
  stats: DashboardStats | undefined;
  newsCount: number | null;
  tvkSectionCount: number | null;
  loading: boolean;
  asyncLoading?: boolean;
};

export function DashboardKpiGrid({
  stats,
  newsCount,
  tvkSectionCount,
  loading,
  asyncLoading = false,
}: DashboardKpiGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      <StatCard
        title="Press releases"
        value={stats?.pressReleases ?? 0}
        icon={FileText}
        loading={loading}
        description="DIPR releases in selected range"
      />
      <StatCard
        title="Press release images"
        value={stats?.govPressReleaseImages ?? 0}
        icon={Image}
        loading={loading}
        description="tn.gov.in image releases in range"
      />
      <StatCard
        title="Government orders"
        value={stats?.governmentOrders ?? 0}
        icon={Gavel}
        loading={loading}
        description="Department G.O.s in range"
      />
      <StatCard
        title="Transfers and postings"
        value={stats?.transfersPostings ?? 0}
        icon={ArrowRightLeft}
        loading={loading}
        description="IAS G.O.s in range"
      />
      <StatCard
        title="Departments"
        value={stats?.departments ?? 0}
        icon={Building2}
        loading={loading}
        description="Government departments directory"
      />
      <StatCard
        title="Ministers"
        value={stats?.ministers ?? 0}
        icon={Users}
        loading={loading}
        description="Council of ministers"
      />
      <StatCard
        title="Districts"
        value={stats?.districts ?? 0}
        icon={MapPin}
        loading={loading}
        description="District profiles"
      />
      <StatCard
        title="Constituencies"
        value={stats?.constituencies ?? 0}
        icon={Landmark}
        loading={loading}
        description="17th assembly seats"
      />
      <StatCard
        title="Government schemes"
        value={stats?.govtSchemes ?? 0}
        icon={Wallet}
        loading={loading}
        description={`${stats?.govtSchemesState ?? 0} state · ${stats?.govtSchemesHousing ?? 0} housing · ${stats?.govtSchemesScholarships ?? 0} scholarships`}
      />
      <StatCard
        title="Magazine issues"
        value={stats?.magazineIssues ?? 0}
        icon={BookOpen}
        loading={loading}
        description="Tamil Arasu catalog"
      />
      <StatCard
        title="News articles"
        value={newsCount ?? 0}
        icon={Newspaper}
        loading={loading || asyncLoading}
        description="Headlines in selected range"
      />
      <StatCard
        title="TVK manifesto sections"
        value={tvkSectionCount ?? 0}
        icon={ScrollText}
        loading={asyncLoading}
        description="Manifesto subsections"
      />
      <StatCard
        title="Map coverage"
        value={`${stats?.mapDistricts ?? 0} / ${stats?.mapConstituencies ?? 0}`}
        icon={Map}
        loading={loading}
        description="Districts / constituencies on map"
      />
    </div>
  );
}
