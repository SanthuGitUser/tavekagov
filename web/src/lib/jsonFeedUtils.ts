export function stableIdFromKey(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return hash || 1;
}

export function normalizeToIsoDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const parts = trimmed.replace(/[/.]/g, "-").split("-");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    if (day.length <= 2 && month.length <= 2 && year.length === 4) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }

  return trimmed;
}

export function mergeUniqueByKey<T>(
  items: T[],
  keyFn: (item: T) => string,
): T[] {
  const merged = new Map<string, T>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    merged.set(key, item);
  }
  return [...merged.values()];
}
