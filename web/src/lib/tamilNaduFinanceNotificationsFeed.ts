import { stableIdFromKey } from "@/lib/jsonFeedUtils";
import type { FinanceNotification } from "@/types/models";

type FinanceNotificationsManifest = {
  source_url?: string;
  fetchedAt?: string;
  count?: number;
  items?: Record<string, unknown>[];
};

export type FinanceNotificationsFeedResponse = {
  sourceUrl: string;
  fetchedAt: string;
  totalResults: number;
  results: FinanceNotification[];
};

const manifestFiles = import.meta.glob(
  "../../../TN-Finance-Notifications/manifests/notifications.json",
  { eager: true, import: "default" },
) as Record<string, FinanceNotificationsManifest>;

function parseItem(raw: Record<string, unknown>): FinanceNotification | null {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const pdfUrl = typeof raw.pdf_url === "string" ? raw.pdf_url.trim() : "";
  const fileName = typeof raw.file_name === "string" ? raw.file_name.trim() : "";
  const localPath = typeof raw.local_path === "string" ? raw.local_path.trim() : null;
  if (!title || !pdfUrl || !fileName) return null;

  return {
    id: stableIdFromKey(pdfUrl),
    title,
    pdf_url: pdfUrl,
    file_name: fileName,
    local_path: localPath || null,
  };
}

function buildFeed(): FinanceNotificationsFeedResponse {
  const manifest = Object.values(manifestFiles)[0] ?? {};
  const sourceUrl = manifest.source_url ?? "https://financedept.tn.gov.in/en/";
  const fetchedAt = manifest.fetchedAt ?? "";

  const results: FinanceNotification[] = [];
  for (const raw of manifest.items ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const parsed = parseItem(raw as Record<string, unknown>);
    if (parsed) results.push(parsed);
  }

  return {
    sourceUrl,
    fetchedAt,
    totalResults: results.length,
    results,
  };
}

export const tamilNaduFinanceNotificationsFeed = buildFeed();

