const PARTY_FILL_COLORS: Record<string, string> = {
  AIADMK: "#1B7D3A",
  AMMK: "#C62828",
  BJP: "#F57C00",
  CPI: "#D32F2F",
  "CPI(M)": "#B71C1C",
  CPIM: "#B71C1C",
  DMK: "#E53935",
  DMDK: "#F9A825",
  INC: "#1565C0",
  IUML: "#2E7D32",
  PMK: "#00897B",
  TVK: "#6A1B9A",
  VCK: "#4527A0",
};

function normalizePartyCode(partyCode: string): string {
  return partyCode.replace(/\s+/g, "").toUpperCase();
}

const partyFillByNormalizedCode = new Map<string, string>();
for (const [code, color] of Object.entries(PARTY_FILL_COLORS)) {
  partyFillByNormalizedCode.set(normalizePartyCode(code), color);
}

export function getPartyFillColor(partyCode: string | null | undefined): string {
  if (!partyCode) return "#94a3b8";
  const direct = PARTY_FILL_COLORS[partyCode];
  if (direct) return direct;
  return partyFillByNormalizedCode.get(normalizePartyCode(partyCode)) ?? "#64748b";
}

export function getPartyFillColorMuted(partyCode: string | null | undefined): string {
  const base = getPartyFillColor(partyCode);
  return `${base}55`;
}
