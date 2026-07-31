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
import type { TnGoDept } from "@/types/database";

const columns: ColumnDef<TnGoDept>[] = [
  {
    accessorKey: "go_date",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.go_date),
  },
  {
    accessorKey: "go_number",
    header: "G.O. No.",
  },
  {
    accessorKey: "department_name",
    header: "Department",
  },
  {
    accessorKey: "go_name",
    header: "Subject",
    cell: ({ row }) => (
      <span className="whitespace-normal break-words">{row.original.go_name}</span>
    ),
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

type GovernmentOrdersTableProps = {
  orders: TnGoDept[];
};

export function GovernmentOrdersTable({ orders }: GovernmentOrdersTableProps) {
  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (orders.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        No government orders found.
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
  );
}
