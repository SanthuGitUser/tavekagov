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
