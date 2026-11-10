const ISO_JSON_DATE_RE = /(\d{4}-\d{2}-\d{2})\.json$/;

export type JsonFileLoader = () => Promise<unknown>;

export function extractIsoDateFromPath(path: string): string | null {
  const match = path.match(ISO_JSON_DATE_RE);
  return match?.[1] ?? null;
}

export async function loadJsonModules<T>(
  loaders: Record<string, JsonFileLoader>,
): Promise<{ path: string; date: string | null; file: T }[]> {
  const entries = await Promise.all(
    Object.entries(loaders).map(async ([path, load]) => {
      const file = (await load()) as T;
      return { path, date: extractIsoDateFromPath(path), file };
    }),
  );

  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

export async function loadJsonModulesByKey<T>(
  loaders: Record<string, JsonFileLoader>,
): Promise<{ path: string; file: T }[]> {
  const entries = await Promise.all(
    Object.entries(loaders).map(async ([path, load]) => ({
      path,
      file: (await load()) as T,
    })),
  );

  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

/**
 * Load-once cache shared by the lazily loaded feeds.
 *
 * - `ensureLoaded()` builds the feed on first call and reuses the same promise after.
 * - A failed build is not cached, so the next call retries (e.g. after a network blip).
 * - `onLoaded` lets a module keep its exported `let` binding in sync for existing callers.
 */
export function createLazyFeed<T>(options: {
  empty: () => T;
  build: () => Promise<T>;
  isLoaded: (feed: T) => boolean;
  onLoaded: (feed: T) => void;
}): { ensureLoaded: () => Promise<T>; reset: () => void } {
  let current = options.empty();
  let pending: Promise<T> | null = null;

  return {
    ensureLoaded() {
      if (options.isLoaded(current)) return Promise.resolve(current);
      if (!pending) {
        pending = options.build().then(
          (feed) => {
            current = feed;
            options.onLoaded(feed);
            return feed;
          },
          (error: unknown) => {
            pending = null;
            throw error;
          },
        );
      }
      return pending;
    },
    reset() {
      pending = null;
      current = options.empty();
      options.onLoaded(current);
    },
  };
}
