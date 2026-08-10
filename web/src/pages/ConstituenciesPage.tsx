import { ChevronDown, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConstituencyMapPanel } from "@/components/constituencies/TamilNaduConstituencyMap2D";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useConstituencySearch } from "@/context/ConstituencySearchContext";
import { filterConstituencies } from "@/lib/constituencyFilterUtils";
import { getPartyFlagUrl } from "@/lib/partyFlagUtils";
import { tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { cn } from "@/lib/utils";
import type { TnConstituency } from "@/types/models";

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function PartyBadge({ party }: { party: string }) {
  const partyFlagUrl = getPartyFlagUrl(party);

  return (
    <Badge variant="outline" className="gap-2 rounded-lg px-2.5 py-1.5">
      {partyFlagUrl ? (
        <img
          src={partyFlagUrl}
          alt=""
          className="h-8 w-12 shrink-0 rounded-md border border-border/60 object-cover"
          loading="lazy"
        />
      ) : null}
      <span className="text-sm font-semibold">{party}</span>
    </Badge>
  );
}

function ConstituencyTile({
  constituency,
  selected,
  onSelect,
}: {
  constituency: TnConstituency;
  selected: boolean;
  onSelect: (acNumber: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayName = toTitleCase(constituency.name);

  return (
    <Card
      id={`constituency-tile-${constituency.ac_number}`}
      className={cn(
        "h-fit self-start overflow-hidden transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : expanded
            ? "border-primary/30"
            : "hover:border-primary/25 hover:bg-accent/20",
      )}
    >
      <button
        type="button"
        onClick={() => {
          onSelect(constituency.ac_number);
          setExpanded((current) => !current);
        }}
        className="flex w-full items-start gap-3 p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h3 className="font-semibold leading-snug">{displayName}</h3>
            {constituency.district ? (
              <p className="mt-1 text-sm text-muted-foreground">{constituency.district}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {constituency.party ? <PartyBadge party={constituency.party} /> : null}
            {constituency.reserved_category ? (
              <Badge variant="secondary">{constituency.reserved_category}</Badge>
            ) : null}
            {constituency.is_minister ? <Badge>Minister</Badge> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="flex flex-col items-end gap-1.5">
            {constituency.photo_url ? (
              <div className="h-20 w-16 overflow-hidden rounded-md bg-muted">
                <img
                  src={constituency.photo_url}
                  alt={constituency.member_name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
            <p
              className="whitespace-nowrap text-right text-xs font-medium"
              title={constituency.member_name}
            >
              {constituency.member_name}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>
      </button>

      {expanded ? (
        <CardContent className="space-y-4 border-t border-border pt-4">
          <div className="space-y-3 text-sm">
            {constituency.member_display_name ? (
              <p className="leading-relaxed text-muted-foreground">
                {constituency.member_display_name}
              </p>
            ) : null}
            {constituency.email ? (
              <p className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <a
                  href={`mailto:${constituency.email}`}
                  className="break-all text-primary hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {constituency.email}
                </a>
              </p>
            ) : null}
            {constituency.phone ? (
              <p className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{constituency.phone}</span>
              </p>
            ) : null}
            {constituency.address ? (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="leading-relaxed">{constituency.address}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {tamilNaduAssemblyConstituenciesFeed.sourceUrls.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                Source <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function ConstituenciesPage() {
  const constituencySearch = useConstituencySearch();
  const search = constituencySearch?.search ?? "";
  const selectedAcNumber = constituencySearch?.selectedAcNumber ?? null;
  const setSelectedAcNumber = constituencySearch?.setSelectedAcNumber;
  const scrollTargetRef = useRef<number | null>(null);

  const constituencies = useMemo(
    () => tamilNaduAssemblyConstituenciesFeed.constituencies,
    [],
  );

  const filtered = useMemo(
    () =>
      filterConstituencies(constituencies, {
        search,
        districtFilter: constituencySearch?.districtFilter ?? "all",
        partyFilter: constituencySearch?.partyFilter ?? "all",
        categoryFilter: constituencySearch?.categoryFilter ?? "all",
        memberFilter: constituencySearch?.memberFilter ?? "all",
      }),
    [constituencies, constituencySearch?.categoryFilter, constituencySearch?.districtFilter, constituencySearch?.memberFilter, constituencySearch?.partyFilter, search],
  );

  const activeAcNumbers = useMemo(() => {
    if (selectedAcNumber) return null;
    const hasFilters =
      search.trim() ||
      (constituencySearch?.districtFilter ?? "all") !== "all" ||
      (constituencySearch?.partyFilter ?? "all") !== "all" ||
      (constituencySearch?.categoryFilter ?? "all") !== "all" ||
      (constituencySearch?.memberFilter ?? "all") !== "all";
    if (hasFilters) {
      return new Set(filtered.map((row) => row.ac_number));
    }
    return null;
  }, [
    filtered,
    search,
    constituencySearch?.categoryFilter,
    constituencySearch?.districtFilter,
    constituencySearch?.memberFilter,
    constituencySearch?.partyFilter,
    selectedAcNumber,
  ]);

  const visibleConstituencies = useMemo(() => {
    if (selectedAcNumber) {
      return filtered.filter((row) => row.ac_number === selectedAcNumber);
    }
    return filtered;
  }, [filtered, selectedAcNumber]);

  useEffect(() => {
    if (selectedAcNumber && !filtered.some((row) => row.ac_number === selectedAcNumber)) {
      setSelectedAcNumber?.(null);
    }
  }, [filtered, selectedAcNumber, setSelectedAcNumber]);

  useEffect(() => {
    const target = scrollTargetRef.current;
    if (!target) return;
    const element = document.getElementById(`constituency-tile-${target}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    scrollTargetRef.current = null;
  }, [selectedAcNumber, visibleConstituencies]);

  function handleSelectAcNumber(acNumber: number | null) {
    setSelectedAcNumber?.(acNumber);
    if (acNumber) scrollTargetRef.current = acNumber;
  }

  function handleTileSelect(acNumber: number) {
    const next = selectedAcNumber === acNumber ? null : acNumber;
    setSelectedAcNumber?.(next);
    if (next) scrollTargetRef.current = next;
  }

  const mapColumn = (
    <div className="flex w-full shrink-0 flex-col self-start lg:sticky lg:top-0 lg:max-h-[calc(100vh-5rem)] lg:min-h-0 lg:w-[45%]">
      <ConstituencyMapPanel
        selectedAcNumber={selectedAcNumber}
        activeAcNumbers={activeAcNumbers}
        onSelectAcNumber={handleSelectAcNumber}
        className="flex max-h-full min-h-0 flex-1 flex-col"
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-3">
      {mapColumn}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No constituencies match your filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleConstituencies.map((constituency) => (
              <ConstituencyTile
                key={constituency.ac_number}
                constituency={constituency}
                selected={selectedAcNumber === constituency.ac_number}
                onSelect={handleTileSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
