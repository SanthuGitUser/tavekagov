import constituencyData from "../../../TN-Map/district-constituencies.json";

export const tamilNaduConstituencyMeta = {
  totalConstituencies: constituencyData.totalConstituencies,
  totalDistricts: constituencyData.totalDistricts,
};

const byDistrict = constituencyData.byDistrict as Record<string, number>;

export function getDistrictConstituencyCount(manifestDistrictName: string): number | null {
  return byDistrict[manifestDistrictName] ?? null;
}

export function formatConstituencyCount(count: number | null): string {
  if (count === null) return "—";
  return count === 1 ? "1 constituency" : `${count} constituencies`;
}
