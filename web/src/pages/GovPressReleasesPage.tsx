import { GovPressReleaseTimeline } from "@/components/gov-press-releases/GovPressReleaseTimeline";
import {
  PublicationFeedGate,
  usePublicationFeed,
} from "@/hooks/usePublicationFeed";
import { ensureGovPressReleasePageFeedsLoaded } from "@/lib/publicationFeedsLoader";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { getGovPressReleases } from "@/lib/tamilNaduGovPressReleaseFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";

export function GovPressReleasesPage() {
  const feed = usePublicationFeed({
    load: ensureGovPressReleasePageFeedsLoaded,
    select: () => getGovPressReleases(),
  });
  const departments = tamilNaduDepartmentsFeed.departments;
  const ministers = tamilNaduMinistersFeed.ministers;

  return (
    <PublicationFeedGate loading={feed.loading} error={feed.error} label="Loading press release images…">
      <div className="flex min-h-0 flex-1 flex-col">
        <GovPressReleaseTimeline
          releases={feed.data}
          departments={departments}
          ministers={ministers}
        />
      </div>
    </PublicationFeedGate>
  );
}
