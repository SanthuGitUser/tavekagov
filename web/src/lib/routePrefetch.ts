/**
 * Warm a route before it is clicked (on hover / focus / touch of its nav link):
 * downloads the page's code and, for publication pages, starts loading its data.
 * Everything is cached by the module system and the feed loaders, so repeated
 * calls are cheap. Paths must match the lazy imports in App.tsx.
 */

type Loader = () => Promise<unknown>;

const feeds = () => import("@/lib/publicationFeedsLoader");

const PREFETCHERS: Record<string, Loader[]> = {
  "/news": [() => import("@/pages/NewsPage")],
  "/press-releases": [
    () => import("@/pages/PressReleasesPage"),
    () => feeds().then((m) => m.ensurePressReleasePageFeedsLoaded()),
  ],
  "/gov-press-releases": [
    () => import("@/pages/GovPressReleasesPage"),
    () => feeds().then((m) => m.ensureGovPressReleasePageFeedsLoaded()),
  ],
  "/dvac-press-releases": [
    () => import("@/pages/DvacPressReleasesPage"),
    () => feeds().then((m) => m.ensureDvacPressReleasePageFeedsLoaded()),
  ],
  "/finance-notifications": [() => import("@/pages/FinanceNotificationsPage")],
  "/government-orders": [
    () => import("@/pages/GovernmentOrdersPage"),
    () => feeds().then((m) => m.ensureGovernmentOrdersPageFeedsLoaded()),
  ],
  "/transfers-postings": [
    () => import("@/pages/TransfersPostingsPage"),
    () => feeds().then((m) => m.ensureTransfersPostingsPageFeedsLoaded()),
  ],
  "/govt-schemes": [() => import("@/pages/GovtSchemesPage")],
  "/magazine": [
    () => import("@/pages/MagazinePage"),
    () => feeds().then((m) => m.ensureMagazinePageFeedsLoaded()),
  ],
  "/ministers": [() => import("@/pages/MinistersPage")],
  "/departments": [() => import("@/pages/DepartmentsPage")],
  "/districts": [() => import("@/pages/DistrictsPage")],
  "/constituencies": [() => import("@/pages/ConstituenciesPage")],
  "/mla": [() => import("@/pages/MlaPage")],
  "/election-results": [() => import("@/pages/ElectionResultsPage")],
  "/tvk-manifesto": [() => import("@/pages/TVKManifestoPage")],
};

const started = new Set<string>();

export function prefetchRoute(to: string): void {
  const path = to.split("?")[0] ?? to;
  if (started.has(path)) return;
  const loaders = PREFETCHERS[path];
  if (!loaders) return;
  started.add(path);
  for (const load of loaders) {
    // Best effort: a failed prefetch is retried by the page itself when opened.
    load().catch(() => started.delete(path));
  }
}
