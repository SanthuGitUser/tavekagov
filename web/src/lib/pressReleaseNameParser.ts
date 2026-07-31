import type { PressRelease, TnDept, TnMinister } from "@/types/models";

import { getChiefMinister } from "@/lib/tamilNaduMinistersFeed";

export type ParsedPressReleaseName = {
  release_type: string | null;
  department_name: string | null;
  topic: string | null;
  confidence: "high" | "medium" | "low";
};

export type PressReleaseEnrichmentContext = {
  departments: TnDept[];
  ministers: TnMinister[];
};

const PREFIX_RE =
  /^(?:DIPR|TNLA)\s*[-.\s]*(?:P\.?\s*R\.?\s*No\.?|TNLA)?\s*[-.\s]*\d+\s*[-.\s]*/i;
const DATE_SUFFIX_RE =
  /\s*[-.\s]*Date[\s.\-]*\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\s*$/i;
const LANG_SUFFIX_RE = /\s*[-.\s]*(English|Tamil)\s*$/i;
const DEPT_SEGMENT_RE = /^(.+?\s+Dept)\s+(.+)$/i;
const DEPT_TOKEN_RE =
  /\bDept\b|\bDepartment\b|Minister for\s+.+|MAWS\s+Dept|EB\s+Dept|RD\s+Dept/i;
const GENERIC_PRESS_RELEASE = /^Press Release$/i;
const MINISTER_FOR_RE = /minister\s+for\s+(.+)$/i;
const MINISTER_TITLE_RE =
  /Hon'?ble\s+(.+?)\s+Minister(?:ial)?(?:\s+Press Release)?/i;
const CM_RE = /Hon'?ble\s+CM\b/i;

const RELEASE_TYPES = [
  "Hon'ble CM Press Release",
  "Hon'ble CM Assembly Speech",
  "Hon'ble CM Speech",
  "Hon'ble Minister for Rural Development and Water Resources Press Release",
  "Hon'ble Rural Development and Water Resources Minister Press Release",
  "Hon'ble Rural Development and Water Resources Review Meeting Press Release",
  "Hon'ble CM DO Letter",
  "Press Release",
] as const;

function normalizeApostrophes(text: string): string {
  return text.replace(/'/g, "'").replace(/`/g, "'").replace(/'/g, "'");
}

function stripHtml(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
}

function normalizeMatchText(value: string): string {
  return stripHtml(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bdept\b/g, "department")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSeparators(text: string): string {
  const normalized = normalizeApostrophes(text);
  return normalized.replace(/\s+-\s+/g, " - ").replace(/\s+/g, " ").trim().replace(/^-+|-+$/g, "");
}

function splitSegments(body: string): string[] {
  return body
    .split(/\s+-\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripPrefix(name: string): string {
  return name.replace(PREFIX_RE, "").trim().replace(/^-+|-+$/g, "");
}

function stripSuffixes(body: string): string {
  let previous = "";
  let current = body.trim();

  while (current !== previous) {
    previous = current;
    current = current.replace(DATE_SUFFIX_RE, "").trim().replace(/^-+|-+$/g, "");
    current = current.replace(LANG_SUFFIX_RE, "").trim().replace(/^-+|-+$/g, "");
  }

  return current;
}

function cleanTopic(value: string | null): string | null {
  if (!value) return null;
  const topic = value.trim().replace(/^-+|-+$/g, "");
  const cleaned = topic.replace(/\s*Press Release\s*$/i, "").trim().replace(/^-+|-+$/g, "");
  return cleaned || null;
}

function detectReleaseType(text: string): { releaseType: string | null; remainder: string } {
  const normalized = normalizeApostrophes(text);
  for (const releaseType of RELEASE_TYPES) {
    if (normalized.toLowerCase().startsWith(releaseType.toLowerCase())) {
      return {
        releaseType,
        remainder: normalized.slice(releaseType.length).trim().replace(/^-+|-+$/g, ""),
      };
    }
  }
  return { releaseType: null, remainder: normalized };
}

function isDepartmentSegment(segment: string): boolean {
  if (GENERIC_PRESS_RELEASE.test(segment)) return false;
  if (DEPT_TOKEN_RE.test(segment)) return true;
  return segment.endsWith(" Dept") || segment.endsWith(" Department");
}

function splitDepartmentSegment(segment: string): { department: string; topic: string | null } {
  const match = DEPT_SEGMENT_RE.exec(segment);
  if (!match) return { department: segment, topic: null };

  const department = match[1]?.trim() ?? segment;
  let topic = cleanTopic(match[2] ?? null);
  if (topic && GENERIC_PRESS_RELEASE.test(topic)) topic = null;
  return { department, topic };
}

export function parsePressReleaseName(name: string): ParsedPressReleaseName {
  const body = stripSuffixes(stripPrefix(normalizeSeparators(name)));
  if (!body) {
    return { release_type: null, department_name: null, topic: null, confidence: "low" };
  }

  let releaseType: string | null = null;
  let topic: string | null = null;
  let departmentName: string | null = null;
  let confidence: ParsedPressReleaseName["confidence"] = "medium";

  const parts = body.includes(" - ") ? splitSegments(body) : [body];
  const detected = detectReleaseType(parts[0] ?? body);
  releaseType = detected.releaseType;

  const remainingParts =
    detected.remainder.length > 0 ? [detected.remainder, ...parts.slice(1)] : parts.slice(1);

  let deptIndex: number | null = null;
  for (let index = 0; index < remainingParts.length; index += 1) {
    if (isDepartmentSegment(remainingParts[index] ?? "")) {
      deptIndex = index;
      break;
    }
  }

  if (deptIndex !== null) {
    const segment = remainingParts[deptIndex] ?? "";
    const split = splitDepartmentSegment(segment);
    departmentName = split.department;
    if (split.topic) {
      topic = split.topic;
      confidence = "high";
    }

    const tail = remainingParts.filter((_, index) => index !== deptIndex);
    if (tail.length > 0) {
      topic = cleanTopic(tail.at(-1) ?? null) ?? topic;
      if (tail.length > 1 && !topic) {
        topic = cleanTopic(tail.join(" - "));
      }
    } else if (remainingParts.length === 1 && !split.topic) {
      topic = splitDepartmentSegment(segment).topic;
    }
  } else if (remainingParts.length >= 2) {
    topic = cleanTopic(remainingParts.at(-1) ?? null);
    if (isDepartmentSegment(remainingParts[0] ?? "")) {
      const split = splitDepartmentSegment(remainingParts[0] ?? "");
      departmentName = split.department;
      topic = split.topic ?? topic;
    }
  } else if (remainingParts.length === 1) {
    const segment = remainingParts[0] ?? "";
    if (isDepartmentSegment(segment)) {
      const split = splitDepartmentSegment(segment);
      departmentName = split.department;
      topic = split.topic;
    } else {
      topic = cleanTopic(segment);
    }
  }

  if (releaseType === null && topic && GENERIC_PRESS_RELEASE.test(topic)) {
    releaseType = "Press Release";
    topic = null;
  }

  if (!releaseType && !departmentName && topic) {
    confidence = "low";
  } else if (departmentName && (topic || releaseType)) {
    confidence = "high";
  } else if (departmentName || releaseType || topic) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    release_type: releaseType,
    department_name: departmentName,
    topic,
    confidence,
  };
}

function sequenceRatio(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;

  const longer = left.length >= right.length ? left : right;
  const shorter = left.length >= right.length ? right : left;
  if (longer.includes(shorter) && shorter.length >= 4) {
    return shorter.length / longer.length;
  }

  let matches = 0;
  const window = Math.floor(longer.length / 2);
  for (let index = 0; index <= shorter.length - window; index += 1) {
    const chunk = shorter.slice(index, index + window);
    if (longer.includes(chunk)) matches += 1;
  }

  return (2 * matches) / (left.length + right.length);
}

function closeMatch(target: string, candidates: string[], cutoff = 0.55): string | null {
  const normalizedTarget = normalizeMatchText(target);
  let best: { value: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = sequenceRatio(normalizedTarget, normalizeMatchText(candidate));
    if (score >= cutoff && (!best || score > best.score)) {
      best = { value: candidate, score };
    }
  }

  return best?.value ?? null;
}

function matchDepartmentId(
  departmentName: string | null,
  departments: TnDept[],
): number | null {
  if (!departmentName) return null;

  const normalized = normalizeMatchText(departmentName);
  for (const department of departments) {
    const candidate = normalizeMatchText(department.name);
    if (normalized.includes(candidate) || candidate.includes(normalized)) {
      return department.id;
    }
  }

  const shortName = departmentName.replace(/\s+Dept$/i, " Department");
  const match = closeMatch(
    shortName,
    departments.map((department) => department.name),
    0.55,
  );
  if (!match) return null;

  return departments.find((department) => department.name === match)?.id ?? null;
}

function matchMinisterByName(
  ministerName: string,
  ministers: TnMinister[],
): { id: number; confidence: string } | null {
  if (!ministerName.trim()) return null;

  const normalized = normalizeMatchText(ministerName);
  const direct = ministers.filter(
    (minister) => normalized && normalized.includes(normalizeMatchText(minister.name)),
  );
  if (direct.length === 1) {
    return { id: direct[0]!.id, confidence: "high" };
  }

  const match = closeMatch(
    ministerName,
    ministers.map((minister) => minister.name),
    0.7,
  );
  if (!match) return null;

  const minister = ministers.find((entry) => entry.name === match);
  return minister ? { id: minister.id, confidence: "medium" } : null;
}

function matchMinisterByPortfolio(
  departmentName: string,
  ministers: TnMinister[],
): { id: number; confidence: string } | null {
  const deptKey = normalizeMatchText(departmentName);
  if (!deptKey) return null;

  let best: { id: number; score: number } | null = null;
  for (const minister of ministers) {
    const portfolioKey = normalizeMatchText(minister.portfolio ?? minister.designation);
    if (deptKey && portfolioKey.includes(deptKey)) {
      const score = deptKey.length;
      if (!best || score > best.score) {
        best = { id: minister.id, score };
      }
    }
  }

  if (!best) return null;
  return { id: best.id, confidence: best.score >= 18 ? "high" : "medium" };
}

function matchMinisterByDesignationHint(
  hint: string,
  ministers: TnMinister[],
): { id: number; confidence: string } | null {
  const keywords = normalizeMatchText(hint)
    .split(" ")
    .filter((word) => word.length > 2);
  if (keywords.length === 0) return null;

  let best: { id: number; score: number } | null = null;
  for (const minister of ministers) {
    const designation = normalizeMatchText(minister.designation);
    let score = 0;
    for (const keyword of keywords) {
      if (designation.includes(keyword)) score += keyword.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: minister.id, score };
    }
  }

  if (!best) return null;
  return { id: best.id, confidence: best.score >= 12 ? "high" : "medium" };
}

function extractMinisterHint(name: string, releaseType: string | null): string | null {
  const sources = [releaseType, name].filter(Boolean).join(" ");
  if (CM_RE.test(sources)) return "chief minister";

  const ministerTitle = MINISTER_TITLE_RE.exec(sources);
  if (ministerTitle?.[1]) return ministerTitle[1].trim();

  const ministerFor = /Minister\s+for\s+(.+?)(?:\s+Press Release|$)/i.exec(sources);
  if (ministerFor?.[1]) return ministerFor[1].trim();

  return null;
}

function matchMinister(
  parsed: ParsedPressReleaseName,
  deptMinisterName: string | null,
  ministers: TnMinister[],
  name: string,
): { id: number | null; confidence: string | null } {
  const releaseType = parsed.release_type ?? "";
  if (releaseType.toLowerCase().includes("cm")) {
    const chief = getChiefMinister();
    if (chief) return { id: chief.id, confidence: "high" };
  }

  if (CM_RE.test(name) || CM_RE.test(releaseType)) {
    const chief = getChiefMinister();
    if (chief) return { id: chief.id, confidence: "high" };
  }

  if (deptMinisterName) {
    const byDeptMinister = matchMinisterByName(deptMinisterName, ministers);
    if (byDeptMinister) return { id: byDeptMinister.id, confidence: byDeptMinister.confidence };
  }

  if (parsed.department_name) {
    const byPortfolio = matchMinisterByPortfolio(parsed.department_name, ministers);
    if (byPortfolio) return { id: byPortfolio.id, confidence: byPortfolio.confidence };
  }

  if (releaseType) {
    const ministerFor = MINISTER_FOR_RE.exec(releaseType);
    if (ministerFor?.[1]) {
      const byPortfolio = matchMinisterByPortfolio(ministerFor[1], ministers);
      if (byPortfolio) return { id: byPortfolio.id, confidence: byPortfolio.confidence };
    }
  }

  const hint = extractMinisterHint(name, parsed.release_type);
  if (hint) {
    if (hint.toLowerCase().includes("chief minister") || hint.toLowerCase() === "cm") {
      const chief = getChiefMinister();
      if (chief) return { id: chief.id, confidence: "high" };
    }

    const byDesignation = matchMinisterByDesignationHint(hint, ministers);
    if (byDesignation) return { id: byDesignation.id, confidence: byDesignation.confidence };

    const byPortfolio = matchMinisterByPortfolio(hint, ministers);
    if (byPortfolio) return { id: byPortfolio.id, confidence: byPortfolio.confidence };
  }

  return { id: null, confidence: null };
}

export function enrichPressRelease(
  release: PressRelease,
  context: PressReleaseEnrichmentContext,
): PressRelease {
  const parsed = parsePressReleaseName(release.name);
  const departmentId = matchDepartmentId(parsed.department_name, context.departments);
  const department = departmentId
    ? context.departments.find((entry) => entry.id === departmentId)
    : undefined;
  const ministerMatch = matchMinister(
    parsed,
    department?.minister_name ?? null,
    context.ministers,
    release.name,
  );

  let resolvedDepartmentId = departmentId;
  if (!resolvedDepartmentId && ministerMatch.id != null) {
    const minister = context.ministers.find((entry) => entry.id === ministerMatch.id);
    if (minister) {
      const ministerDepartments = context.departments.filter(
        (entry) =>
          normalizeMatchText(entry.minister_name ?? "") === normalizeMatchText(minister.name),
      );
      if (ministerDepartments.length === 1) {
        resolvedDepartmentId = ministerDepartments[0]!.id;
      }
    }
  }

  return {
    ...release,
    release_type: parsed.release_type,
    department_name: parsed.department_name,
    topic: parsed.topic,
    department_id: resolvedDepartmentId,
    minister_id: ministerMatch.id,
    name_parsed: true,
    parse_confidence: parsed.confidence,
    minister_match_confidence: ministerMatch.confidence,
  };
}

export function enrichPressReleases(
  releases: PressRelease[],
  context: PressReleaseEnrichmentContext,
): PressRelease[] {
  return releases.map((release) => enrichPressRelease(release, context));
}
