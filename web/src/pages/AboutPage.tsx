import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase";

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
            into Supabase using Python sync scripts in this repository.
          </p>
          <p>
            This frontend is built with Vite, React, TypeScript, Tailwind CSS,
            shadcn-style components, TanStack Table, and Recharts. It is
            designed for static hosting on GitHub Pages.
          </p>
          <p>
            Status:{" "}
            <strong className="text-foreground">
              {isSupabaseConfigured
                ? "Connected to Supabase (anon key + RLS)."
                : "Demo mode — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."}
            </strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Press releases — DIPR press release API</p>
          <p>Government orders — tn.gov.in department G.O. listings</p>
          <p>Departments, ministers, districts — tn.gov.in HTML pages</p>
        </CardContent>
      </Card>
    </div>
  );
}
