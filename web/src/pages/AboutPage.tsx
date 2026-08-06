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
                This frontend is built with Vite, React, TypeScript, Tailwind CSS, shadcn-style
                components, TanStack Table, and Recharts. It loads bundled JSON manifests at build
                time and is designed for static hosting on GitHub Pages.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Press releases — DIPR press release API (daily JSON)</p>
              <p>Press release images — tn.gov.in press release archives (daily JSON)</p>
              <p>Government orders — tn.gov.in department G.O. listings (per-department JSON)</p>
              <p>Transfers and postings — tnsectdemo.tn.gov.in IAS G.O.s (daily JSON)</p>
              <p>Magazine — Tamil Virtual Academy Digital Library (JSON manifest)</p>
              <p>Departments, ministers, districts — tn.gov.in HTML pages (JSON manifests); district map boundaries in `TN-Map/`; tile photos from tn.gov.in</p>
              <p>News — NewsData.io API (daily JSON)</p>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
