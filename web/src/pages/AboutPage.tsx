import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About TavekaGov</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            TavekaGov is an open-data dashboard for Tamil Nadu government
            publications and directories. Data is synchronized from official
            sources such as{" "}
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
            into JSON files in this repository using Python sync scripts. GitHub
            Actions refresh the datasets daily at 11:00 PM IST.
          </p>
          <p>
            This frontend is built with Vite, React, TypeScript, Tailwind CSS,
            shadcn-style components, TanStack Table, and Recharts. It loads
            bundled JSON manifests at build time and is designed for static
            hosting on GitHub Pages.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Press releases — DIPR press release API (daily JSON)</p>
          <p>PR images — tn.gov.in press release archives (daily JSON)</p>
          <p>Government orders — tn.gov.in department G.O. listings (daily JSON)</p>
          <p>Transfers and postings — tnsectdemo.tn.gov.in IAS G.O.s (daily JSON)</p>
          <p>Magazine — Tamil Virtual Academy Digital Library (JSON manifest)</p>
          <p>Departments, ministers, districts — tn.gov.in HTML pages (JSON manifests)</p>
          <p>News — NewsData.io API (daily JSON)</p>
        </CardContent>
      </Card>
    </div>
  );
}
