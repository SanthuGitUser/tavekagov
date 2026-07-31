import { MapPin } from "lucide-react";
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
  const href = district.website_url ?? undefined;
  const isLink = Boolean(href);

  const content = (
    <>
      <div className="relative aspect-[5/4] overflow-hidden bg-muted">
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

  if (!isLink) {
    return (
      <Card className="overflow-hidden opacity-90">
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-border bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md"
      title={`Visit ${district.name} website`}
    >
      {content}
    </a>
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
    <div className="grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
      {filtered.map((district) => (
        <DistrictTile key={district.id} district={district} />
      ))}
    </div>
  );
}
