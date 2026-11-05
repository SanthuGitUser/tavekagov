import { GovernmentOrdersTimeline } from "@/components/government-orders/GovernmentOrdersTimeline";
import {
  PublicationFeedGate,
  usePublicationFeed,
} from "@/hooks/usePublicationFeed";
import { getDepartmentsByEncoded } from "@/lib/tamilNaduDepartmentsFeed";
import { getGovernmentOrders } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { buildMinistersByKey } from "@/lib/tamilNaduMinistersFeed";
import { ensureGovernmentOrdersPageFeedsLoaded } from "@/lib/publicationFeedsLoader";

export function GovernmentOrdersPage() {
  const feed = usePublicationFeed({
    load: ensureGovernmentOrdersPageFeedsLoaded,
    select: () => getGovernmentOrders(),
  });
  const deptByEncoded = getDepartmentsByEncoded();
  const ministersByKey = buildMinistersByKey();

  return (
    <PublicationFeedGate loading={feed.loading} error={feed.error} label="Loading government orders…">
      <div className="flex min-h-0 flex-1 flex-col">
        <GovernmentOrdersTimeline
          orders={feed.data}
          deptByEncoded={deptByEncoded}
          ministersByKey={ministersByKey}
        />
      </div>
    </PublicationFeedGate>
  );
}
