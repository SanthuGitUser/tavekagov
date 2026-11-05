import { mergeUniqueByKey, normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import { loadJsonModulesByKey } from "@/lib/lazyDailyJsonFeed";
import type { TnGoDept } from "@/types/models";

type DepartmentResponseFile = {
  source_url?: string;
  department_name?: string;
  dep_id_encoded?: string;
  orders?: Record<string, unknown>[];
};

const departmentJsonLoaders = import.meta.glob(
  "../../../TN-Government Orders/Response JSON/*.json",
  { import: "default" },
) as Record<string, () => Promise<DepartmentResponseFile>>;

function orderKey(order: TnGoDept): string {
  return `${order.go_number}|${order.dep_id_encoded}|${order.go_date}|${order.pdf_url}`;
}

function parseOrder(raw: Record<string, unknown>): TnGoDept | null {
  const goNumber = typeof raw.go_number === "string" ? raw.go_number.trim() : "";
  const depIdEncoded = typeof raw.dep_id_encoded === "string" ? raw.dep_id_encoded.trim() : "";
  const pdfUrl = typeof raw.pdf_url === "string" ? raw.pdf_url.trim() : "";
  const goDate = normalizeToIsoDate(raw.go_date);
  if (!goNumber || !depIdEncoded || !pdfUrl || !goDate) return null;

  return {
    id: stableIdFromKey(`${goNumber}|${depIdEncoded}|${goDate}|${pdfUrl}`),
    go_date: goDate,
    go_number: goNumber,
    go_name: typeof raw.go_name === "string" ? raw.go_name : "",
    department_name: typeof raw.department_name === "string" ? raw.department_name : "",
    dep_id_encoded: depIdEncoded,
    pdf_url: pdfUrl,
  };
}

function collectRawOrders(files: DepartmentResponseFile[]): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();

  for (const file of files) {
    if (!Array.isArray(file.orders)) continue;

    const departmentName =
      typeof file.department_name === "string" ? file.department_name.trim() : "";
    const depIdEncoded =
      typeof file.dep_id_encoded === "string" ? file.dep_id_encoded.trim() : "";

    for (const raw of file.orders) {
      const enriched: Record<string, unknown> = {
        ...raw,
        department_name:
          typeof raw.department_name === "string" && raw.department_name.trim()
            ? raw.department_name
            : departmentName,
        dep_id_encoded:
          typeof raw.dep_id_encoded === "string" && raw.dep_id_encoded.trim()
            ? raw.dep_id_encoded
            : depIdEncoded,
      };
      const parsed = parseOrder(enriched);
      if (!parsed) continue;
      byKey.set(orderKey(parsed), enriched);
    }
  }

  return [...byKey.values()];
}

type GovernmentOrdersFeed = {
  sourceUrl: string;
  totalResults: number;
  orders: TnGoDept[];
};

let loadPromise: Promise<GovernmentOrdersFeed> | null = null;

export let tamilNaduGovernmentOrdersFeed: GovernmentOrdersFeed = {
  sourceUrl: "https://www.tn.gov.in/godept_list.php",
  totalResults: 0,
  orders: [],
};

async function buildFeedAsync(): Promise<GovernmentOrdersFeed> {
  const loaded = await loadJsonModulesByKey<DepartmentResponseFile>(departmentJsonLoaders);
  const files = loaded.map((entry) => entry.file);

  const orders = mergeUniqueByKey(
    collectRawOrders(files)
      .map((raw) => parseOrder(raw))
      .filter((order): order is TnGoDept => order !== null),
    orderKey,
  );

  orders.sort((left, right) => {
    const dateDiff = right.go_date.localeCompare(left.go_date);
    if (dateDiff !== 0) return dateDiff;
    return left.go_number.localeCompare(right.go_number);
  });

  const sourceUrl = files[0]?.source_url ?? "https://www.tn.gov.in/godept_list.php";

  return {
    sourceUrl,
    totalResults: orders.length,
    orders,
  };
}

export function ensureTamilNaduGovernmentOrdersFeedLoaded(): Promise<GovernmentOrdersFeed> {
  if (tamilNaduGovernmentOrdersFeed.orders.length > 0) {
    return Promise.resolve(tamilNaduGovernmentOrdersFeed);
  }
  if (!loadPromise) {
    loadPromise = buildFeedAsync().then((feed) => {
      tamilNaduGovernmentOrdersFeed = feed;
      return feed;
    });
  }
  return loadPromise;
}

export function getGovernmentOrders(): TnGoDept[] {
  return tamilNaduGovernmentOrdersFeed.orders;
}

export function resetTamilNaduGovernmentOrdersFeedCache(): void {
  loadPromise = null;
  tamilNaduGovernmentOrdersFeed = {
    sourceUrl: "https://www.tn.gov.in/godept_list.php",
    totalResults: 0,
    orders: [],
  };
}
