const TN_GOV_DISTRICT_IMAGE_BASE =
  "https://www.tn.gov.in/sites/default/district-images/district-list-images";

/** tn.gov.in file names that differ from manifest district names. */
const DISTRICT_IMAGE_FILENAME_ALIASES: Record<string, string> = {
  "The Nilgiris": "TheNilgiris",
};

export function getDistrictImageUrl(districtName: string): string {
  const fileName =
    DISTRICT_IMAGE_FILENAME_ALIASES[districtName] ?? districtName;
  return `${TN_GOV_DISTRICT_IMAGE_BASE}/${encodeURIComponent(fileName)}.png`;
}
