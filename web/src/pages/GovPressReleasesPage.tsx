import { useMemo } from "react";

import { GovPressReleaseTimeline } from "@/components/gov-press-releases/GovPressReleaseTimeline";
import {
  getGovPressReleaseDepartments,
  getGovPressReleaseMinisters,
  getGovPressReleases,
} from "@/lib/tamilNaduGovPressReleaseFeed";

export function GovPressReleasesPage() {
  const releases = useMemo(() => getGovPressReleases(), []);
  const departments = useMemo(() => getGovPressReleaseDepartments(), []);
  const ministers = useMemo(() => getGovPressReleaseMinisters(), []);

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
