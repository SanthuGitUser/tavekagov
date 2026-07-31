import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { GovernmentOrdersTable } from "@/components/government-orders/GovernmentOrdersTable";
import {
  getLatestValidDate,
  VerticalDatePicker,
} from "@/components/shared/VerticalDatePicker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGovernmentOrdersSearch } from "@/context/GovernmentOrdersSearchContext";
import { useGovernmentOrdersView } from "@/context/GovernmentOrdersViewContext";
import { cn } from "@/lib/utils";
import type { TnDept, TnGoDept, TnMinister } from "@/types/models";

type GovernmentOrdersTimelineProps = {
  orders: TnGoDept[];
  deptByEncoded?: Record<string, TnDept>;
  ministersByKey?: Record<string, TnMinister>;
};

function parseGoDate(value: string): Date {
  return parseISO(value.includes("T") ? value : `${value}T00:00:00`);
}

function parseGoNumber(value: string): number | null {
  const match = value.match(/(\d+)/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareByGoNumber(a: TnGoDept, b: TnGoDept): number {
  const aNo = parseGoNumber(a.go_number);
  const bNo = parseGoNumber(b.go_number);

  if (aNo === null && bNo === null) return a.go_name.localeCompare(b.go_name);
  if (aNo === null) return 1;
  if (bNo === null) return -1;
  if (aNo !== bNo) return aNo - bNo;
  return a.go_name.localeCompare(b.go_name);
}

function matchesSearch(order: TnGoDept, query: string): boolean {
  if (!query) return true;
  const haystack = [
    order.go_name,
    order.go_number,
    order.department_name,
    order.go_date,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveMinister(
  ministerName: string | null | undefined,
  ministersByKey: Record<string, TnMinister>,
): TnMinister | null {
  if (!ministerName) return null;
  const exact = ministersByKey[normalizeKey(ministerName)];
  if (exact) return exact;

  const target = normalizeKey(ministerName);
  const keys = Object.keys(ministersByKey);
  const partial = keys.find((key) => key.includes(target) || target.includes(key));
  return partial ? ministersByKey[partial] : null;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function GovernmentOrdersTimeline({
  orders,
  deptByEncoded = {},
  ministersByKey = {},
}: GovernmentOrdersTimelineProps) {
  const governmentOrdersSearch = useGovernmentOrdersSearch();
  const governmentOrdersView = useGovernmentOrdersView();
  const search = governmentOrdersSearch?.search ?? "";
  const viewMode = governmentOrdersView?.viewMode ?? "calendar";

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;

  const viewOrders = useMemo(() => {
    if (!isSearching) return orders;
    return orders.filter((order) => matchesSearch(order, query));
  }, [orders, isSearching, query]);

  const availableDates = useMemo(
    () => [...new Set(viewOrders.map((order) => order.go_date))],
    [viewOrders],
  );

  const [selectedDepartment, setSelectedDepartment] = useState<string>("");

  const searchMatches = useMemo(() => {
    if (!isSearching) return [];
    return viewOrders
      .sort((a, b) => {
        const dateCompare = b.go_date.localeCompare(a.go_date);
        if (dateCompare !== 0) return dateCompare;
        return compareByGoNumber(a, b);
      });
  }, [viewOrders, isSearching]);

  const searchMatchesByDate = useMemo(() => {
    const grouped = new Map<string, TnGoDept[]>();
    for (const order of searchMatches) {
      const existing = grouped.get(order.go_date);
      if (existing) {
        existing.push(order);
      } else {
        grouped.set(order.go_date, [order]);
      }
    }
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [searchMatches]);

  const datesForPicker = useMemo(() => {
    if (!isSearching) return availableDates;
    return [...new Set(searchMatches.map((order) => order.go_date))];
  }, [availableDates, isSearching, searchMatches]);

  const latestDate = useMemo(
    () => getLatestValidDate(datesForPicker),
    [datesForPicker],
  );

  const [selectedDate, setSelectedDate] = useState<string>(latestDate ?? "");

  useEffect(() => {
    if (latestDate) setSelectedDate(latestDate);
  }, [latestDate]);

  useEffect(() => {
    if (selectedDate && !datesForPicker.includes(selectedDate) && latestDate) {
      setSelectedDate(latestDate);
    }
  }, [datesForPicker, latestDate, selectedDate]);

  const ordersForDate = useMemo(() => {
    return viewOrders
      .filter((order) => order.go_date === selectedDate)
      .sort(compareByGoNumber);
  }, [viewOrders, selectedDate]);

  const ordersByDepartment = useMemo(() => {
    const map = new Map<string, TnGoDept[]>();
    for (const order of viewOrders) {
      const dept = order.department_name?.trim();
      if (!dept) continue;
      const existing = map.get(dept);
      if (existing) existing.push(order);
      else map.set(dept, [order]);
    }
    return map;
  }, [viewOrders]);

  const departmentTiles = useMemo(() => {
    const tiles = [...ordersByDepartment.entries()].map(([dept, deptOrders]) => {
      const sortedOrders = [...deptOrders].sort((a, b) => {
        const dateCompare = b.go_date.localeCompare(a.go_date);
        if (dateCompare !== 0) return dateCompare;
        return compareByGoNumber(a, b);
      });

      const depIdEncoded = sortedOrders[0]?.dep_id_encoded;
      const deptRow = depIdEncoded ? deptByEncoded[depIdEncoded] : undefined;
      const ministerName = deptRow?.minister_name ?? null;
      const minister = resolveMinister(ministerName, ministersByKey);

      return {
        dept,
        count: deptOrders.length,
        latestGoDate: sortedOrders[0]?.go_date ?? null,
        orders: sortedOrders,
        ministerName,
        minister,
      };
    });

    tiles.sort((a, b) => {
      const aDate = a.latestGoDate;
      const bDate = b.latestGoDate;
      if (aDate && bDate) {
        const dateCompare = bDate.localeCompare(aDate);
        if (dateCompare !== 0) return dateCompare;
      } else if (aDate) {
        return -1;
      } else if (bDate) {
        return 1;
      }

      return a.dept.localeCompare(b.dept);
    });

    return tiles;
  }, [ordersByDepartment, deptByEncoded, ministersByKey]);

  useEffect(() => {
    if (!selectedDepartment && departmentTiles.length > 0) {
      setSelectedDepartment(departmentTiles[0].dept);
      return;
    }

    if (
      selectedDepartment &&
      departmentTiles.length > 0 &&
      !departmentTiles.some((tile) => tile.dept === selectedDepartment)
    ) {
      setSelectedDepartment(departmentTiles[0].dept);
    }
  }, [departmentTiles, selectedDepartment]);

  const selectedDepartmentTile = useMemo(() => {
    if (!selectedDepartment) return null;
    return departmentTiles.find((tile) => tile.dept === selectedDepartment) ?? null;
  }, [departmentTiles, selectedDepartment]);

  const ordersForSelectedDepartment = useMemo(() => {
    return selectedDepartmentTile?.orders ?? [];
  }, [selectedDepartmentTile]);

  if (!latestDate) {
    return (
      <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        {isSearching ? "No government orders match your search." : "No government orders found."}
      </p>
    );
  }

  if (isSearching && viewMode !== "department") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-3 shrink-0">
          <h2 className="text-lg font-bold tracking-tight">Search results</h2>
          <p className="text-xs text-muted-foreground">
            {searchMatches.length} order
            {searchMatches.length === 1 ? "" : "s"} across {searchMatchesByDate.length}{" "}
            {searchMatchesByDate.length === 1 ? "date" : "dates"}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {searchMatchesByDate.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No government orders match your search.
            </p>
          ) : (
            <div className="space-y-5">
              {searchMatchesByDate.map(([date, dayOrders]) => (
                <section key={date}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">
                    {format(parseGoDate(date), "EEEE, d MMMM yyyy")}
                  </h3>
                  <GovernmentOrdersTable orders={dayOrders} />
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (viewMode === "department") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full shrink-0 flex-col lg:w-[340px]">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {departmentTiles.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                No departments found.
              </p>
            ) : (
              <div className="space-y-3">
                {departmentTiles.map(({ dept, count }) => {
                  const isSelected = dept === selectedDepartment;
                  return (
                    <Card
                      key={dept}
                      className={cn(
                        "transition-colors",
                        isSelected
                          ? "border-primary/35 bg-accent/40"
                          : "hover:border-primary/25 hover:bg-accent/20",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedDepartment(dept)}
                        className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-pressed={isSelected}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                              {dept}
                            </h3>
                            <Badge variant="outline" className="shrink-0">
                              {count}
                            </Badge>
                          </div>
                        </CardContent>
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="mb-3 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <h2 className="min-w-0 text-lg font-bold tracking-tight">
                {selectedDepartment || "Select a department"}
              </h2>

              {selectedDepartmentTile ? (
                (() => {
                  const displayName =
                    selectedDepartmentTile.minister?.name ?? selectedDepartmentTile.ministerName;
                  const photoUrl = selectedDepartmentTile.minister?.photo_url ?? null;
                  const designation = selectedDepartmentTile.minister?.designation ?? null;
                  if (!displayName) return null;
                  return (
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                            {getInitials(displayName)}
                          </div>
                        )}
                      </div>
                      <div className="max-w-[260px] text-right">
                        <p className="truncate text-sm font-semibold">{displayName}</p>
                        {designation ? (
                          <p className="truncate text-xs text-muted-foreground">{designation}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {!selectedDepartment ? (
              <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                Select a department to view government orders.
              </p>
            ) : ordersForSelectedDepartment.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
                No government orders for this department.
              </p>
            ) : (
              <GovernmentOrdersTable orders={ordersForSelectedDepartment} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:overflow-hidden">
      <aside className="flex shrink-0 flex-col items-center">
        <p className="mb-1.5 w-[128px] text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Select date
        </p>
        <VerticalDatePicker
          availableDates={datesForPicker}
          value={selectedDate}
          onChange={setSelectedDate}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 shrink-0">
          <h2 className="text-lg font-bold tracking-tight">
            {format(parseGoDate(selectedDate), "EEEE, d MMMM yyyy")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {ordersForDate.length} order
            {ordersForDate.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {ordersForDate.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No government orders on this date.
            </p>
          ) : (
            <GovernmentOrdersTable orders={ordersForDate} />
          )}
        </div>
      </div>
    </div>
  );
}
