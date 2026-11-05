import MiniSearch from "minisearch";

export type SearchDocument = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  dataset: string;
};

let index: MiniSearch<SearchDocument> | null = null;
let documents: SearchDocument[] = [];

export function buildSearchIndex(items: SearchDocument[]): void {
  documents = items;
  index = new MiniSearch<SearchDocument>({
    fields: ["title", "subtitle", "dataset"],
    storeFields: ["title", "subtitle", "href", "dataset"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.15,
      boost: { title: 2, dataset: 1.5 },
    },
  });
  index.addAll(items);
}

export function querySearchIndex(query: string, limit = 40): SearchDocument[] {
  if (!index || !query.trim() || query.trim().length < 2) return [];
  const results = index.search(query.trim(), { combineWith: "AND" });
  return results.slice(0, limit).map((result) => {
    const doc = documents.find((item) => item.id === result.id);
    return (
      doc ?? {
        id: String(result.id),
        title: String(result.title ?? result.id),
        subtitle: String(result.subtitle ?? ""),
        href: String(result.href ?? "/"),
        dataset: String(result.dataset ?? ""),
      }
    );
  });
}
