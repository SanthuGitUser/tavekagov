import { DvacPressReleaseTimeline } from "@/components/dvac-press-releases/DvacPressReleaseTimeline";
import {
  PublicationFeedGate,
  usePublicationFeed,
} from "@/hooks/usePublicationFeed";
import { ensureDvacPressReleasePageFeedsLoaded } from "@/lib/publicationFeedsLoader";
import { tamilNaduDvacPressReleaseFeed } from "@/lib/tamilNaduDvacPressReleaseFeed";

export function DvacPressReleasesPage() {
  const feed = usePublicationFeed({
    load: ensureDvacPressReleasePageFeedsLoaded,
    select: () => tamilNaduDvacPressReleaseFeed.results,
  });

  return (
    <PublicationFeedGate loading={feed.loading} error={feed.error} label="Loading DVAC releases…">
      <div className="flex min-h-0 flex-1 flex-col">
        <DvacPressReleaseTimeline releases={feed.data} />
      </div>
    </PublicationFeedGate>
  );
}

