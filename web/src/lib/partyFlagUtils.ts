const PARTY_FLAG_BY_CODE: Record<string, string> = {
  AIADMK: "AIADMK_Flag.svg.webp",
  AMMK: "193-1938288_ammk-amma-makkal-munnetra-kazhagam-flag-png-transparent.png",
  BJP: "BJP_Flag.svg.webp",
  CPI: "CPI-flag.PNG",
  "CPI(M)": "CPI-M-flag.svg.webp",
  CPIM: "CPI-M-flag.svg.webp",
  DMK: "Flag_DMK.svg.webp",
  DMDK: "DMDK_flag.PNG",
  INC: "Indian_National_Congress_Flag.svg.webp",
  IUML: "Flag_of_the_Indian_Union_Muslim_League.svg.webp",
  PMK: "PMK.svg.webp",
  TVK: "Tamilaga_Vettri_Kazhagam_(TVK)_Flag.png",
  VCK: "VCK.svg.webp",
};

function normalizePartyCode(partyCode: string): string {
  return partyCode.replace(/\s+/g, "").toUpperCase();
}

const partyFlagByNormalizedCode = new Map<string, string>();
for (const [code, filename] of Object.entries(PARTY_FLAG_BY_CODE)) {
  partyFlagByNormalizedCode.set(normalizePartyCode(code), filename);
}

const flagModules = import.meta.glob<string>(
  "../../../TN-Constituencies/Flags/*",
  { eager: true, query: "?url", import: "default" },
);

const flagUrlByFilename = new Map<string, string>();
for (const [path, url] of Object.entries(flagModules)) {
  const filename = path.split("/").pop();
  if (filename) flagUrlByFilename.set(filename, url);
}

export function getPartyFlagUrl(partyCode: string): string | null {
  const filename =
    PARTY_FLAG_BY_CODE[partyCode] ?? partyFlagByNormalizedCode.get(normalizePartyCode(partyCode));
  if (!filename) return null;
  return flagUrlByFilename.get(filename) ?? null;
}
