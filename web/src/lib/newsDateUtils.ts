import type { NewsArticle } from "@/types/news";

export const NEWS_DISPLAY_TIMEZONE = "Asia/Kolkata";

/** Parse NewsData.io pubDate using its declared timezone (usually UTC). */
export function parseNewsDateTime(value: string, timezone = "UTC"): Date {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const hasOffset =
    normalized.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(normalized);

  if (hasOffset) {
    return new Date(normalized);
  }

  if (timezone.toUpperCase() === "UTC") {
    return new Date(`${normalized}Z`);
  }

  // NewsData typically marks UTC; fall back safely for unknown labels.
  return new Date(`${normalized}Z`);
}

/** Article calendar date in IST (YYYY-MM-DD) for filtering and charts. */
export function getArticleDateInIst(article: NewsArticle): string {
  const date = parseNewsDateTime(article.pubDate, article.pubDateTZ);
  return new Intl.DateTimeFormat("en-CA", { timeZone: NEWS_DISPLAY_TIMEZONE }).format(date);
}

/** Human-readable publication time in IST. */
export function formatPubDateInIst(value: string, timezone = "UTC"): string {
  const date = parseNewsDateTime(value, timezone);
  const formatted = new Intl.DateTimeFormat("en-IN", {
    timeZone: NEWS_DISPLAY_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `${formatted} IST`;
}

export function formatArticlePubDateInIst(article: NewsArticle): string {
  return formatPubDateInIst(article.pubDate, article.pubDateTZ);
}
