import { useMemo } from "react";

import { PressReleaseTimeline } from "@/components/press-releases/PressReleaseTimeline";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { tamilNaduPressReleaseFeed } from "@/lib/tamilNaduPressReleaseFeed";

export function PressReleasesPage() {
  const releases = useMemo(() => tamilNaduPressReleaseFeed.results, []);
  const departments = useMemo(() => tamilNaduDepartmentsFeed.departments, []);
  const ministers = useMemo(() => tamilNaduMinistersFeed.ministers, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PressReleaseTimeline
        releases={releases}
        departments={departments}
        ministers={ministers}
      />
    </div>
  );
}
