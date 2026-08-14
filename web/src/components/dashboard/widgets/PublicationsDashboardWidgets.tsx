import { format, parseISO } from "date-fns";
import { ExternalLink } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardListItem,
  DashboardWidgetCard,
} from "@/components/dashboard/DashboardWidgetCard";
import { formatPrNumber } from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import {
  getPressReleaseTrendForDashboard,
  getRecentGovPressReleasesForDashboard,
  getRecentGovernmentOrdersForDashboard,
  getRecentPressReleasesForDashboard,
  getRecentTransferRowsForDashboard,
  getRecentTransfersForDashboard,
} from "@/lib/dashboardWidgetData";
import type {
  GovPressRelease,
  PressRelease,
  TnGoDept,
  TnTransfersPosting,
} from "@/types/models";

type DateRange = { from: string; to: string } | null;

function formatIsoDate(value: string): string {
  return format(parseISO(value.includes("T") ? value : `${value}T00:00:00`), "d MMM yyyy");
}

function PressReleaseListItem({ release }: { release: PressRelease }) {
  const prNumber = formatPrNumber(release.dipr_pr_no);
  return (
    <DashboardListItem
      title={release.name}
      meta={[formatIsoDate(release.pr_date), prNumber, release.department_name]
        .filter(Boolean)
        .join(" · ")}
      href={release.pdf_url}
    />
  );
}

function GovPressReleaseListItem({ release }: { release: GovPressRelease }) {
  return (
    <DashboardListItem
      title={release.title ?? release.file_name ?? "Press release image"}
      meta={[formatIsoDate(release.release_date), release.department_name, release.minister_name]
        .filter(Boolean)
        .join(" · ")}
      href={release.image_url}
    />
  );
}

function GovernmentOrderListItem({ order }: { order: TnGoDept }) {
  return (
    <DashboardListItem
      title={order.go_name || order.go_number}
      meta={[formatIsoDate(order.go_date), order.go_number, order.department_name]
        .filter(Boolean)
        .join(" · ")}
      href={order.pdf_url}
    />
  );
}

function TransferListItem({ posting }: { posting: TnTransfersPosting }) {
  return (
    <DashboardListItem
      title={posting.subject}
      meta={[formatIsoDate(posting.go_date), posting.go_number].filter(Boolean).join(" · ")}
      href={posting.pdf_url}
    />
  );
}

export function PressReleasesRecentWidget({ dateRange }: { dateRange: DateRange }) {
  const releases = getRecentPressReleasesForDashboard(dateRange, 5);

  return (
    <DashboardWidgetCard
      title="Recent press releases"
      description="Latest DIPR releases in the selected date range"
      viewAllTo="/press-releases"
    >
      {releases.length === 0 ? (
        <DashboardEmptyState message="No press releases in this date range." />
      ) : (
        <div className="space-y-2">
          {releases.map((release) => (
            <PressReleaseListItem key={release.id} release={release} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function PressReleasesTrendWidget({ dateRange }: { dateRange: DateRange }) {
  const trend = getPressReleaseTrendForDashboard(dateRange);
  const max = Math.max(...trend.map((entry) => entry.press), 1);

  return (
    <DashboardWidgetCard
      title="Press release trend"
      description="Monthly release counts (timeline widget preview)"
      viewAllTo="/press-releases"
    >
      {trend.length === 0 ? (
        <DashboardEmptyState message="No press release trend data for this range." />
      ) : (
        <div className="space-y-2">
          {trend.map((entry) => (
            <div key={entry.month} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{entry.month}</span>
                <span className="tabular-nums text-muted-foreground">{entry.press}</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.max(8, (entry.press / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function GovPressReleasesRecentWidget({ dateRange }: { dateRange: DateRange }) {
  const releases = getRecentGovPressReleasesForDashboard(dateRange, 5);

  return (
    <DashboardWidgetCard
      title="Recent press release images"
      description="Latest tn.gov.in image releases"
      viewAllTo="/gov-press-releases"
    >
      {releases.length === 0 ? (
        <DashboardEmptyState message="No press release images in this date range." />
      ) : (
        <div className="space-y-2">
          {releases.map((release) => (
            <GovPressReleaseListItem key={release.id} release={release} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function GovPressReleasesImageGridWidget({ dateRange }: { dateRange: DateRange }) {
  const releases = getRecentGovPressReleasesForDashboard(dateRange, 8);

  return (
    <DashboardWidgetCard
      title="Press release image grid"
      description="Thumbnail preview grid"
      viewAllTo="/gov-press-releases"
    >
      {releases.length === 0 ? (
        <DashboardEmptyState message="No images to preview in this date range." />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {releases.map((release) => (
            <a
              key={release.id}
              href={release.image_url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-md border border-border bg-muted"
              title={release.title ?? release.file_name ?? "Press release image"}
            >
              <img
                src={release.image_url}
                alt={release.title ?? "Press release image"}
                className="aspect-[4/3] w-full object-cover transition group-hover:scale-[1.02]"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function GovernmentOrdersRecentWidget({ dateRange }: { dateRange: DateRange }) {
  const orders = getRecentGovernmentOrdersForDashboard(dateRange, 5);

  return (
    <DashboardWidgetCard
      title="Recent government orders"
      description="Latest G.O.s in the selected date range"
      viewAllTo="/government-orders"
    >
      {orders.length === 0 ? (
        <DashboardEmptyState message="No government orders in this date range." />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <GovernmentOrderListItem key={order.id} order={order} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function GovernmentOrdersTableWidget({ dateRange }: { dateRange: DateRange }) {
  const orders = getRecentGovernmentOrdersForDashboard(dateRange, 8);

  return (
    <DashboardWidgetCard
      title="Government orders table"
      description="Compact table preview"
      viewAllTo="/government-orders"
      contentClassName="overflow-x-auto"
    >
      {orders.length === 0 ? (
        <DashboardEmptyState message="No government orders in this date range." />
      ) : (
        <table className="w-full min-w-[32rem] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">G.O.</th>
              <th className="px-2 py-2 font-medium">Department</th>
              <th className="px-2 py-2 font-medium">Subject</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-2 whitespace-nowrap">{formatIsoDate(order.go_date)}</td>
                <td className="px-2 py-2 whitespace-nowrap">
                  <a href={order.pdf_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {order.go_number}
                  </a>
                </td>
                <td className="px-2 py-2">{order.department_name}</td>
                <td className="px-2 py-2">{order.go_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardWidgetCard>
  );
}

export function TransfersRecentWidget({ dateRange }: { dateRange: DateRange }) {
  const postings = getRecentTransfersForDashboard(dateRange, 5);

  return (
    <DashboardWidgetCard
      title="Recent transfers and postings"
      description="Latest IAS G.O.s"
      viewAllTo="/transfers-postings"
    >
      {postings.length === 0 ? (
        <DashboardEmptyState message="No transfers and postings in this date range." />
      ) : (
        <div className="space-y-2">
          {postings.map((posting) => (
            <TransferListItem key={posting.id} posting={posting} />
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}

export function TransfersTableWidget({ dateRange }: { dateRange: DateRange }) {
  const rows = getRecentTransferRowsForDashboard(dateRange, 6);

  return (
    <DashboardWidgetCard
      title="Transfers and postings table"
      description="Parsed officer rows preview"
      viewAllTo="/transfers-postings"
      contentClassName="overflow-x-auto"
    >
      {rows.length === 0 ? (
        <DashboardEmptyState message="No parsed officer rows in this date range." />
      ) : (
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-2 py-2 font-medium">Officer</th>
              <th className="px-2 py-2 font-medium">Old post</th>
              <th className="px-2 py-2 font-medium">New post</th>
              <th className="px-2 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.row_id} className="border-b border-border/60 last:border-0">
                <td className="px-2 py-2">{row.officer_name}</td>
                <td className="px-2 py-2">{row.old_post}</td>
                <td className="px-2 py-2">{row.new_post}</td>
                <td className="px-2 py-2 whitespace-nowrap">{formatIsoDate(row.go_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DashboardWidgetCard>
  );
}

export function PressReleasesTimelineWidget({ dateRange }: { dateRange: DateRange }) {
  const releases = getRecentPressReleasesForDashboard(dateRange, 8);

  return (
    <DashboardWidgetCard
      title="Press release timeline"
      description="Compact timeline-style preview"
      viewAllTo="/press-releases"
    >
      {releases.length === 0 ? (
        <DashboardEmptyState message="No press releases in this date range." />
      ) : (
        <div className="relative space-y-3 pl-4 before:absolute before:bottom-1 before:left-1 before:top-1 before:w-px before:bg-border">
          {releases.map((release) => {
            const prNumber = formatPrNumber(release.dipr_pr_no);
            return (
              <div key={release.id} className="relative">
                <span className="absolute -left-4 top-2 h-2 w-2 rounded-full bg-primary" />
                <div className="rounded-md border border-border/70 bg-background/40 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {formatIsoDate(release.pr_date)}
                    </Badge>
                    {prNumber ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {prNumber}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium leading-snug">{release.name}</p>
                  <a
                    href={release.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open PDF
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
