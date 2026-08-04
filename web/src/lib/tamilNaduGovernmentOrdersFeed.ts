import { mergeUniqueByKey, normalizeToIsoDate, stableIdFromKey } from "@/lib/jsonFeedUtils";
import type { TnGoDept } from "@/types/models";

type DepartmentResponseFile = {
  source_url?: string;
  department_name?: string;
  dep_id_encoded?: string;
  orders?: Record<string, unknown>[];
};

const departmentJsonFiles = import.meta.glob(
  "../../../TN-Government Orders/Response JSON/*.json",
  { eager: true, import: "default" },
) as Record<string, DepartmentResponseFile>;

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

function collectRawOrders(): Record<string, unknown>[] {
  const byKey = new Map<string, Record<string, unknown>>();

  for (const file of Object.values(departmentJsonFiles)) {
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

function buildFeed() {
  const orders = mergeUniqueByKey(
    collectRawOrders()
      .map((raw) => parseOrder(raw))
      .filter((order): order is TnGoDept => order !== null),
    orderKey,
  );

  orders.sort((left, right) => {
    const dateDiff = right.go_date.localeCompare(left.go_date);
    if (dateDiff !== 0) return dateDiff;
    return left.go_number.localeCompare(right.go_number);
  });

  const sourceUrl =
    Object.values(departmentJsonFiles)[0]?.source_url ??
    "https://www.tn.gov.in/godept_list.php";

  return {
    sourceUrl,
    totalResults: orders.length,
    orders,
  };
}

export const tamilNaduGovernmentOrdersFeed = buildFeed();

export function getGovernmentOrders(): TnGoDept[] {
  return tamilNaduGovernmentOrdersFeed.orders;
}
