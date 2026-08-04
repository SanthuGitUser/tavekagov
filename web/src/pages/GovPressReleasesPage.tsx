import { useMemo } from "react";

import { GovPressReleaseTimeline } from "@/components/gov-press-releases/GovPressReleaseTimeline";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import {
  getGovPressReleases,
} from "@/lib/tamilNaduGovPressReleaseFeed";

export function GovPressReleasesPage() {
  const releases = useMemo(() => getGovPressReleases(), []);
  const departments = useMemo(() => tamilNaduDepartmentsFeed.departments, []);
  const ministers = useMemo(() => tamilNaduMinistersFeed.ministers, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GovPressReleaseTimeline
        releases={releases}
        departments={departments}
        ministers={ministers}
      />
    </div>
  );
}
