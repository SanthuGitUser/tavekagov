import { useMemo } from "react";

import { DvacPressReleaseTimeline } from "@/components/dvac-press-releases/DvacPressReleaseTimeline";
import { tamilNaduDvacPressReleaseFeed } from "@/lib/tamilNaduDvacPressReleaseFeed";

export function DvacPressReleasesPage() {
  const releases = useMemo(() => tamilNaduDvacPressReleaseFeed.results, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DvacPressReleaseTimeline releases={releases} />
    </div>
  );
}

