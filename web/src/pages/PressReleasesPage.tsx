import { PressReleaseTimeline } from "@/components/press-releases/PressReleaseTimeline";
import {
  PublicationFeedGate,
  usePublicationFeed,
} from "@/hooks/usePublicationFeed";
import { ensurePressReleasePageFeedsLoaded } from "@/lib/publicationFeedsLoader";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { tamilNaduPressReleaseFeed } from "@/lib/tamilNaduPressReleaseFeed";

export function PressReleasesPage() {
  const feed = usePublicationFeed({
    label: "Loading press releases…",
    load: ensurePressReleasePageFeedsLoaded,
    select: () => tamilNaduPressReleaseFeed.results,
  });
  const departments = tamilNaduDepartmentsFeed.departments;
  const ministers = tamilNaduMinistersFeed.ministers;

  return (
    <PublicationFeedGate loading={feed.loading} error={feed.error} label="Loading press releases…">
      <div className="flex min-h-0 flex-1 flex-col">
        <PressReleaseTimeline
          releases={feed.data}
          departments={departments}
          ministers={ministers}
        />
      </div>
    </PublicationFeedGate>
  );
}
