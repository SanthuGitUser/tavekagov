import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>About TavekaGov</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  TavekaGov is an open-data dashboard for Tamil Nadu government publications and
                  directories. Data is synchronized from official sources such as{" "}
                  <a
                    href="https://dipr.tn.gov.in/"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    DIPR
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.tn.gov.in/"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    tn.gov.in
                  </a>{" "}
                  into JSON files in this repository using Python sync scripts.
                </p>
                <p>
                  Large publication datasets (press releases, G.O.s, transfers, magazine daily JSON) load
                  on demand via Vite code splitting. Use <strong>Search</strong> for cross-dataset lookup.
                  Sync health metadata lives in <code>Sync-Config/last-sync.json</code> (see{" "}
                  <code>sync_health.py</code>).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Dashboard — KPI overview with optional date range</p>
                <p>News — Tamil Nadu headlines (loads one day at a time)</p>
                <p>Govt Publications — Press releases, press release images, G.O.s, IAS transfers, government schemes, magazines</p>
                <p>Govt Administration — Ministers, departments, constituencies, districts</p>
                <p>Search — Full-text search across indexed datasets</p>
                <p>DVAC / Finance — Vigilance press releases and Finance Department notifications</p>
                <p>MLA — MyNeta winner summaries (manifest JSON)</p>
                <p>TVK Manifesto — Tamilaga Vetri Kazhagam election manifesto by category and section</p>
                <p>About — Project overview and data sources</p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Data sources</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>Press releases — DIPR press release API (daily JSON)</p>
                <p>Press release images — tn.gov.in press release archives (daily JSON)</p>
                <p>Government orders — tn.gov.in department G.O. listings (per-department JSON)</p>
                <p>Transfers and postings — tnsectdemo.tn.gov.in IAS G.O.s (daily JSON)</p>
                <p>Government schemes — Schemes in India (manifest JSON)</p>
                <p>Magazine — Tamil Digital Library (JSON manifest)</p>
                <p>Ministers — tn.gov.in minister list; portfolios enriched from Wikipedia</p>
                <p>Departments — tn.gov.in department directory; Wikipedia cross-reference manifest</p>
                <p>Constituencies — 17th Tamil Nadu Legislative Assembly (manifest JSON)</p>
                <p>Districts — tn.gov.in district profiles; map boundaries in `TN-Map/`</p>
                <p>News — NewsData.io API (daily JSON, loaded on demand in the browser)</p>
                <p>Election Results — TN Assembly 2026 ECI round-wise counts and Form 20 (`scripts/sync-election.ps1`)</p>
                <p>DVAC — dvac.tn.gov.in press releases (daily JSON)</p>
                <p>Finance notifications — financedept.tn.gov.in manifest</p>
                <p>MLA — myneta.info Tamil Nadu 2026 winners manifest</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
