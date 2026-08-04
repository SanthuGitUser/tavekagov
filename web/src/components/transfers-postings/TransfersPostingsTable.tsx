import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { TnTransfersPostingRow } from "@/types/models";

const emptyCell = "—";

const columns: ColumnDef<TnTransfersPostingRow>[] = [
  {
    accessorKey: "go_date",
    header: "G.O. Date",
    cell: ({ row }) => (
      <span className="whitespace-nowrap">{formatDate(row.original.go_date)}</span>
    ),
  },
  {
    accessorKey: "go_number",
    header: "G.O. Details",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">{row.original.go_number}</span>
    ),
  },
  {
    accessorKey: "officer_name",
    header: "Name",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">
        {row.original.officer_name || emptyCell}
      </span>
    ),
  },
  {
    accessorKey: "old_post",
    header: "Old Post",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">{row.original.old_post || emptyCell}</span>
    ),
  },
  {
    accessorKey: "new_post",
    header: "New Post",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">{row.original.new_post || emptyCell}</span>
    ),
  },
  {
    accessorKey: "details",
    header: "Details",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words text-muted-foreground">
        {row.original.details || emptyCell}
      </span>
    ),
  },
  {
    accessorKey: "confidence",
    header: "Confidence",
    cell: ({ row }) => {
      const value = row.original.confidence;
      if (typeof value !== "number") return <span>{emptyCell}</span>;
      const pct = Math.round(value * 100);
      return <span className="tabular-nums">{pct}%</span>;
    },
  },
  {
    id: "pdf",
    header: "PDF",
    cell: ({ row }) => (
      <a
        href={row.original.pdf_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        Open <ExternalLink className="h-3.5 w-3.5" />
      </a>
    ),
  },
];

type TransfersPostingsTableProps = {
  rows: TnTransfersPostingRow[];
};

export function TransfersPostingsTable({ rows }: TransfersPostingsTableProps) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.row_id,
  });

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No transfers and postings found.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
