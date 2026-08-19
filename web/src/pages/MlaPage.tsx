import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  tamilNaduMlaFeed,
} from "@/lib/tamilNaduMlaFeed";
import { Button } from "@/components/ui/button";
import { useMlaSearch } from "@/context/MlaSearchContext";

export function MlaPage() {
  const mlaSearch = useMlaSearch();

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 9;

  function parseCriminalCases(value: string | null | undefined): number | null {
    const raw = String(value ?? "").trim();
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function matchesCriminalCasesFilter(filterValue: string, casesValue: string): boolean {
    if (filterValue === "all") return true;

    const n = parseCriminalCases(casesValue);
    if (filterValue === "unknown") return n === null;
    if (n === null) return false;

    if (filterValue.startsWith("eq:")) {
      const target = Number(filterValue.slice("eq:".length));
      return Number.isFinite(target) ? n === target : false;
    }

    if (filterValue.startsWith("lt:")) {
      const target = Number(filterValue.slice("lt:".length));
      return Number.isFinite(target) ? n < target : false;
    }

    if (filterValue.startsWith("gte:")) {
      const target = Number(filterValue.slice("gte:".length));
      return Number.isFinite(target) ? n >= target : false;
    }

    if (filterValue.startsWith("btw:")) {
      const parts = filterValue.split(":");
      const low = Number(parts[1]);
      const high = Number(parts[2]);
      if (!Number.isFinite(low) || !Number.isFinite(high)) return false;
      return n >= low && n <= high;
    }

    return true;
  }

  function parseRupees(value: string): number | null {
    const text = String(value ?? "").trim();
    if (!text) return null;

    // Common MyNeta formats: "Rs. 1,23,456", "Rs 1,23,456", sometimes just "1,23,456".
    const rsMatch = text.match(/Rs\.?\s*([\d,]+)/i);
    const numberMatch = rsMatch?.[1] ?? text.match(/([\d,]{2,})/)?.[1] ?? null;
    if (!numberMatch) return null;

    const n = Number(numberMatch.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  function bucketCrores(value: string): string {
    const rupees = parseRupees(value);
    if (rupees === null) return "Unknown";
    const crores = rupees / 10_000_000;
    if (crores < 1) return "< 1 Cr";
    if (crores < 10) return "1 - 10 Cr";
    if (crores < 100) return "10 - 100 Cr";
    return "100+ Cr";
  }

  const rows = useMemo(() => {
    const q = (mlaSearch?.search ?? "").trim().toLowerCase();
    return tamilNaduMlaFeed.mlas.filter((m) => {
      if (!mlaSearch) return true;

      const normalizeParty = (value: string) => {
        const withoutSuffix = value.trim().replace(/\s+S$/i, "").trim();
        const PARTY_CODE_BY_NAME: Record<string, string> = {
          "Amma Makkal Munnettra Kazagam": "AMMK",
          "Desiya Murpokku Dravida Kazhagam": "DMDK",
          "Indian Union Muslim League": "IUML",
          "Pattali Makkal Katchi": "PMK",
          "Tamilaga Vettri Kazhagam": "TVK",
          "Viduthalai Chiruthaigal Katchi": "VCK",
        };
        return PARTY_CODE_BY_NAME[withoutSuffix] ?? withoutSuffix;
      };
      if (
        mlaSearch.partyFilter !== "all" &&
        normalizeParty(m.party) !== normalizeParty(mlaSearch.partyFilter)
      )
        return false;
      const cases = (m.criminal_case || "0").trim();
      if (!matchesCriminalCasesFilter(mlaSearch.criminalCasesFilter, cases)) return false;

      const edu = m.education_category || m.education;
      if (mlaSearch.educationFilter !== "all" && edu !== mlaSearch.educationFilter) return false;

      const assetsBucket = bucketCrores(m.total_assets);
      if (mlaSearch.assetsFilter !== "all" && assetsBucket !== mlaSearch.assetsFilter) return false;

      const liabBucket = bucketCrores(m.liabilities);
      if (mlaSearch.liabilitiesFilter !== "all" && liabBucket !== mlaSearch.liabilitiesFilter)
        return false;

      if (mlaSearch.districtFilter !== "all" && m.district !== mlaSearch.districtFilter)
        return false;

      if (!q) return true;
      return (
        m.constituency_name.toLowerCase().includes(q) ||
        m.candidate_name.toLowerCase().includes(q) ||
        m.party.toLowerCase().includes(q) ||
        (m.district || "").toLowerCase().includes(q)
      );
    });
  }, [
    mlaSearch?.assetsFilter,
    mlaSearch?.criminalCasesFilter,
    mlaSearch?.districtFilter,
    mlaSearch?.educationFilter,
    mlaSearch?.liabilitiesFilter,
    mlaSearch?.partyFilter,
    mlaSearch?.search,
  ]);

  useEffect(() => {
    setPageIndex(0);
  }, [
    mlaSearch?.assetsFilter,
    mlaSearch?.criminalCasesFilter,
    mlaSearch?.districtFilter,
    mlaSearch?.educationFilter,
    mlaSearch?.liabilitiesFilter,
    mlaSearch?.partyFilter,
    mlaSearch?.search,
  ]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = pageIndex * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, pageIndex]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6">
      <div className="rounded-xl border border-border">
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member Name</TableHead>
                <TableHead>Constituency name</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Criminal Case</TableHead>
                <TableHead>Education</TableHead>
                <TableHead>Total Assets</TableHead>
                <TableHead>Liabilities</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.length ? (
                pagedRows.map((m) => (
                  <TableRow key={m.candidate_id} className={cn("hover:bg-muted/50")}>
                    <TableCell className="font-medium">{m.candidate_name}</TableCell>
                    <TableCell className="font-medium">{m.constituency_name}</TableCell>
                    <TableCell>{m.party}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.criminal_case || "0"}</TableCell>
                    <TableCell>{m.education_category || m.education}</TableCell>
                    <TableCell>{m.total_assets}</TableCell>
                    <TableCell>{m.liabilities}</TableCell>
                    <TableCell>
                      {m.candidate_url ? (
                        <a
                          href={m.candidate_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          title="Open link"
                          aria-label="Open link"
                        >
                          <ExternalLink className="h-4 w-4" />
                          <span className="hidden sm:inline">Open link</span>
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {rows.length} member(s) • Page {Math.min(pageIndex + 1, pageCount)} of {pageCount}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
            disabled={pageIndex >= pageCount - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

