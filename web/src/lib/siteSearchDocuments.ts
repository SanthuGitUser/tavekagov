import { tamilNaduAssemblyConstituenciesFeed } from "@/lib/tamilNaduAssemblyConstituenciesFeed";
import { tamilNaduDepartmentsFeed } from "@/lib/tamilNaduDepartmentsFeed";
import { tamilNaduDistrictsFeed } from "@/lib/tamilNaduDistrictsFeed";
import { tamilNaduGovtSchemesFeed } from "@/lib/tamilNaduGovtSchemesFeed";
import { tamilNaduMinistersFeed } from "@/lib/tamilNaduMinistersFeed";
import { ensureDashboardPublicationFeedsLoaded } from "@/lib/publicationFeedsLoader";
import {
  tamilNaduGovPressReleaseFeed,
  tamilNaduGovernmentOrdersFeed,
  tamilNaduPressReleaseFeed,
} from "@/lib/dashboardWidgetData";
import { buildSearchIndex, type SearchDocument } from "@/lib/siteSearchIndex";

let loadPromise: Promise<SearchDocument[]> | null = null;

export async function loadSiteSearchDocuments(): Promise<SearchDocument[]> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await ensureDashboardPublicationFeedsLoaded();

    const docs: SearchDocument[] = [];

    for (const release of tamilNaduPressReleaseFeed.results.slice(0, 500)) {
      docs.push({
        id: `dipr-${release.id}`,
        title: release.name,
        subtitle: release.department_name ?? release.pr_date,
        href: "/press-releases",
        dataset: "DIPR Press Releases",
      });
    }

    for (const release of tamilNaduGovPressReleaseFeed.releases.slice(0, 300)) {
      docs.push({
        id: `govpr-${release.id}`,
        title: release.title ?? "Press release image",
        subtitle: release.release_date,
        href: "/gov-press-releases",
        dataset: "Press Release Images",
      });
    }

    for (const order of tamilNaduGovernmentOrdersFeed.orders.slice(0, 500)) {
      docs.push({
        id: `go-${order.id}`,
        title: order.go_name || order.go_number,
        subtitle: order.department_name,
        href: order.pdf_url,
        dataset: "Government Orders",
      });
    }

    for (const dept of tamilNaduDepartmentsFeed.departments) {
      docs.push({
        id: `dept-${dept.id}`,
        title: dept.name,
        subtitle: dept.minister_name ?? "",
        href: "/departments",
        dataset: "Departments",
      });
    }

    for (const minister of tamilNaduMinistersFeed.ministers) {
      docs.push({
        id: `minister-${minister.id}`,
        title: minister.name,
        subtitle: minister.designation,
        href: "/ministers",
        dataset: "Ministers",
      });
    }

    for (const district of tamilNaduDistrictsFeed.districts) {
      docs.push({
        id: `district-${district.id}`,
        title: district.name,
        subtitle: district.population ?? "",
        href: "/districts",
        dataset: "Districts",
      });
    }

    for (const constituency of tamilNaduAssemblyConstituenciesFeed.constituencies) {
      docs.push({
        id: `ac-${constituency.ac_number}`,
        title: constituency.name,
        subtitle: constituency.party ?? "",
        href: "/constituencies",
        dataset: "Constituencies",
      });
    }

    for (const scheme of tamilNaduGovtSchemesFeed.schemes.slice(0, 400)) {
      docs.push({
        id: `scheme-${scheme.id}`,
        title: scheme.title,
        subtitle: scheme.category ?? "",
        href: "/govt-schemes",
        dataset: "Government Schemes",
      });
    }

    buildSearchIndex(docs);
    return docs;
  })();

  return loadPromise;
}
