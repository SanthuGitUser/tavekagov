import { ExternalLink, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useDistrictSearch } from "@/context/DistrictSearchContext";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import type { TnDistrict } from "@/types/models";

const TN_GOV_DISTRICT_IMAGE_BASE =
  "https://www.tn.gov.in/sites/default/district-images/district-list-images";

function getDistrictImageUrl(name: string): string {
  return `${TN_GOV_DISTRICT_IMAGE_BASE}/${encodeURIComponent(name)}.png`;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function DistrictTile({ district }: { district: TnDistrict }) {
  const [imageFailed, setImageFailed] = useState(false);
  const websiteHref = district.website_url ?? null;

  function openWebsite(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!websiteHref) return;
    window.open(websiteHref, "_blank", "noopener,noreferrer");
  }

  const content = (
    <>
      <div className="relative aspect-[5/4] overflow-hidden bg-muted">
        {websiteHref ? (
          <button
            type="button"
            onClick={openWebsite}
            className="absolute right-1.5 top-1.5 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`Visit ${district.name} website`}
            title="Visit website"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {!imageFailed ? (
          <img
            src={getDistrictImageUrl(district.name)}
            alt={district.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-primary/5 text-primary">
            <span className="text-sm font-bold">{getInitials(district.name)}</span>
            <MapPin className="h-3.5 w-3.5 opacity-70" />
          </div>
        )}
      </div>
      <div className="space-y-0.5 p-1.5 sm:p-2">
        <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-foreground group-hover:text-primary sm:text-xs">
          {district.name}
        </h3>
        <p className="line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
          <span className="font-medium text-foreground/75">Pop:</span>{" "}
          {district.population ?? "—"}
        </p>
        <p className="line-clamp-1 text-[9px] text-muted-foreground sm:text-[10px]">
          <span className="font-medium text-foreground/75">Area:</span>{" "}
          {district.area_size ?? "—"}
        </p>
      </div>
    </>
  );

  return (
    <Card className="group overflow-hidden">
      <CardContent className="p-0">{content}</CardContent>
    </Card>
  );
}

export function DistrictsPage() {
  const districtSearch = useDistrictSearch();
  const search = districtSearch?.search ?? "";
  const districts = useMemo(() => tamilNaduDistrictsFeed.districts, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return districts;
    return districts.filter((district) => {
      const haystack = [
        district.name,
        district.population,
        district.area_size,
        district.website_url,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [districts, search]);

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No districts match your search.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
          {filtered.map((district) => (
            <DistrictTile key={district.id} district={district} />
          ))}
        </div>
      </div>
    </div>
  );
}
