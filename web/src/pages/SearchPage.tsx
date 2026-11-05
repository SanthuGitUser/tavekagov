import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PageLoading } from "@/components/shared/PageLoading";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/context/LocaleContext";
import { loadSiteSearchDocuments } from "@/lib/siteSearchDocuments";
import { querySearchIndex } from "@/lib/siteSearchIndex";

export function SearchPage() {
  const { t } = useLocale();
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadSiteSearchDocuments()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => querySearchIndex(query), [query, ready]);

  if (!ready) {
    return <PageLoading label="Building search index…" />;
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4">
      <h1 className="shrink-0 text-xl font-bold tracking-tight">{t("search.title")}</h1>
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.placeholder")}
        autoFocus
        className="shrink-0"
      />
      {query.trim().length < 2 ? (
        <p className="text-sm text-muted-foreground">{t("search.empty")}</p>
      ) : (
        <ul
          className="min-h-0 flex-1 divide-y divide-border overflow-y-auto overscroll-y-contain rounded-md border border-border bg-card"
          aria-label="Search results"
        >
          {results.map((result) => (
            <li key={result.id} className="px-3 py-2 text-sm">
              <Link to={result.href.startsWith("/") ? result.href : "/government-orders"} className="font-medium text-primary hover:underline">
                {result.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {result.dataset}
                {result.subtitle ? ` · ${result.subtitle}` : ""}
              </p>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted-foreground">No matches.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
