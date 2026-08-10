import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

import { comparePressReleases } from "@/components/press-releases/pressReleaseUtils";
import { formatPrNumber } from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { PressRelease } from "@/types/models";

const columns: ColumnDef<PressRelease>[] = [
  {
    accessorKey: "pr_date",
    header: "Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{formatDate(row.original.pr_date)}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Title",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "dipr_pr_no",
    header: "PR No.",
    cell: ({ row }) => formatPrNumber(row.original.dipr_pr_no) ?? "—",
  },
  {
    id: "pdf",
    header: "PDF",
    cell: ({ row }) => (
      <a
        href={row.original.pdf_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 whitespace-nowrap text-primary hover:underline"
      >
        Open <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ),
  },
];

type PressReleasesTableProps = {
  releases: PressRelease[];
  emptyMessage?: string;
};

export function PressReleasesTable({
  releases,
  emptyMessage = "No press releases found.",
}: PressReleasesTableProps) {
  const sortedReleases = useMemo(
    () => [...releases].sort(comparePressReleases),
    [releases],
  );

  const table = useReactTable({
    data: sortedReleases,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (releases.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const prNumber = formatPrNumber(row.original.dipr_pr_no);
            return (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {cell.column.id === "dipr_pr_no" && prNumber ? (
                      <Badge variant="outline" className="px-1.5 py-0 text-[11px]">
                        {prNumber}
                      </Badge>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
