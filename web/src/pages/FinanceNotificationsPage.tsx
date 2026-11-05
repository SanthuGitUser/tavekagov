import { ExternalLink, FileDown } from "lucide-react";
import { useMemo } from "react";

import { DashboardEmptyState } from "@/components/dashboard/DashboardWidgetCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tamilNaduFinanceNotificationsFeed } from "@/lib/tamilNaduFinanceNotificationsFeed";

export function FinanceNotificationsPage() {
  const feed = tamilNaduFinanceNotificationsFeed;
  const results = useMemo(() => feed.results, [feed.results]);
  const lastUpdated = feed.lastFetchedAt || feed.fetchedAt;

  if (results.length === 0) {
    return <DashboardEmptyState message="No finance notifications found yet." />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {lastUpdated ? (
        <p className="text-xs text-muted-foreground">
          Manifest last checked: {lastUpdated}. Finance publishes budget documents on the homepage
          widget; run <code className="text-[11px]">sync-all.ps1</code> to refresh.
        </p>
      ) : null}
      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="whitespace-nowrap">File</TableHead>
              <TableHead className="whitespace-nowrap">PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-normal break-words">{item.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.file_name}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <a
                    href={item.pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    title={item.local_path ? `Downloaded to ${item.local_path}` : undefined}
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {item.local_path ? (
                    <span className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <FileDown className="h-3.5 w-3.5" />
                      Saved
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

