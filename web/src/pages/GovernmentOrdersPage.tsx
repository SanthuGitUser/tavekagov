import { useMemo } from "react";

import { GovernmentOrdersTimeline } from "@/components/government-orders/GovernmentOrdersTimeline";
import { getDepartmentsByEncoded } from "@/lib/tamilNaduDepartmentsFeed";
import { getGovernmentOrders } from "@/lib/tamilNaduGovernmentOrdersFeed";
import { buildMinistersByKey } from "@/lib/tamilNaduMinistersFeed";

export function GovernmentOrdersPage() {
  const orders = useMemo(() => getGovernmentOrders(), []);
  const deptByEncoded = useMemo(() => getDepartmentsByEncoded(), []);
  const ministersByKey = useMemo(() => buildMinistersByKey(), []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GovernmentOrdersTimeline
        orders={orders}
        deptByEncoded={deptByEncoded}
        ministersByKey={ministersByKey}
      />
    </div>
  );
}
