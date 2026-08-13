import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ConstituencySearchProvider } from "@/context/ConstituencySearchContext";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoading } from "@/components/shared/PageLoading";
import { SourceLink } from "@/components/shared/SourceLink";
import { DashboardDateRangeProvider } from "@/context/DashboardDateRangeContext";
import { GovernmentSearchProvider } from "@/context/GovernmentSearchContext";
import { DistrictSearchProvider } from "@/context/DistrictSearchContext";
import { GovPressReleaseSearchProvider } from "@/context/GovPressReleaseSearchContext";
import { GovPressReleaseViewProvider } from "@/context/GovPressReleaseViewContext";
import { GovtSchemesSearchProvider } from "@/context/GovtSchemesSearchContext";
import { GovernmentOrdersSearchProvider } from "@/context/GovernmentOrdersSearchContext";
import { GovernmentOrdersViewProvider } from "@/context/GovernmentOrdersViewContext";
import { MagazineSearchProvider } from "@/context/MagazineSearchContext";
import { NewsSearchProvider } from "@/context/NewsSearchContext";
import { PressReleaseSearchProvider } from "@/context/PressReleaseSearchContext";
import { PressReleaseViewProvider } from "@/context/PressReleaseViewContext";
import { TVKManifestoSearchProvider } from "@/context/TVKManifestoSearchContext";
import { TransfersPostingsSearchProvider } from "@/context/TransfersPostingsSearchContext";
import { AboutPage } from "@/pages/AboutPage";
import { ConstituenciesPage } from "@/pages/ConstituenciesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MinistersPage } from "@/pages/MinistersPage";
import { DepartmentsPage } from "@/pages/DepartmentsPage";
import { DistrictsPage } from "@/pages/DistrictsPage";
import { GovPressReleasesPage } from "@/pages/GovPressReleasesPage";
import { GovtSchemesPage } from "@/pages/GovtSchemesPage";
import { GovernmentOrdersPage } from "@/pages/GovernmentOrdersPage";
import { HomePage } from "@/pages/HomePage";
import { MagazinePage } from "@/pages/MagazinePage";
import { PressReleasesPage } from "@/pages/PressReleasesPage";
import { TVKManifestoPage } from "@/pages/TVKManifestoPage";
import { TransfersPostingsPage } from "@/pages/TransfersPostingsPage";

const NewsPage = lazy(() =>
  import("@/pages/NewsPage").then((module) => ({ default: module.NewsPage })),
);

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/"
          element={<AppLayout hidePageHeader title="Home" />}
        >
          <Route index element={<HomePage />} />
        </Route>
        <Route
          path="/dashboard"
          element={
            <DashboardDateRangeProvider>
              <AppLayout
                fillViewport
                title="Dashboard"
                description={
                  <>
                    Overview of Tamil Nadu government open data from{" "}
                    <SourceLink href="https://www.tn.gov.in/">tn.gov.in</SourceLink>.
                  </>
                }
              />
            </DashboardDateRangeProvider>
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
        <Route
          path="/press-releases"
          element={
            <PressReleaseSearchProvider>
              <PressReleaseViewProvider>
                <AppLayout
                  fillViewport
                  title="Press Releases"
                  description={
                    <>
                      DIPR press releases with department from{" "}
                      <SourceLink href="https://dipr.tn.gov.in/press-release1.html">
                        dipr.tn.gov.in
                      </SourceLink>
                      .
                    </>
                  }
                />
              </PressReleaseViewProvider>
            </PressReleaseSearchProvider>
          }
        >
          <Route index element={<PressReleasesPage />} />
        </Route>
        <Route
          path="/gov-press-releases"
          element={
            <GovPressReleaseSearchProvider>
              <GovPressReleaseViewProvider>
                <AppLayout
                  fillViewport
                  title="Images"
                  description={
                    <>
                      Tamil Nadu government press release images from{" "}
                      <SourceLink href="https://www.tn.gov.in/press_release.php">
                        tn.gov.in
                      </SourceLink>
                      .
                    </>
                  }
                />
              </GovPressReleaseViewProvider>
            </GovPressReleaseSearchProvider>
          }
        >
          <Route index element={<GovPressReleasesPage />} />
        </Route>
        <Route
          path="/government-orders"
          element={
            <GovernmentOrdersSearchProvider>
              <GovernmentOrdersViewProvider>
                <AppLayout
                  fillViewport
                  title="Government Orders"
                  description={
                    <>
                      Department G.O.s with searchable subjects and PDF links from{" "}
                      <SourceLink href="https://www.tn.gov.in/godept_list.php">
                        tn.gov.in
                      </SourceLink>
                      .
                    </>
                  }
                />
              </GovernmentOrdersViewProvider>
            </GovernmentOrdersSearchProvider>
          }
        >
          <Route index element={<GovernmentOrdersPage />} />
        </Route>
        <Route
          path="/transfers-postings"
          element={
            <TransfersPostingsSearchProvider>
              <AppLayout
                fillViewport
                title="Transfers and Postings"
                description={
                  <>
                    IAS transfers and postings parsed from G.O. PDFs on{" "}
                    <SourceLink href="https://tnsectdemo.tn.gov.in/ias/transferandpostings.php">
                      tn.gov.in
                    </SourceLink>
                    .
                  </>
                }
              />
            </TransfersPostingsSearchProvider>
          }
        >
          <Route index element={<TransfersPostingsPage />} />
        </Route>
        <Route
          path="/ministers"
          element={
            <GovernmentSearchProvider>
              <AppLayout
                fillViewport
                title="Ministers"
                description={
                  <>
                    Tamil Nadu council of ministers from{" "}
                    <SourceLink href="https://www.tn.gov.in/minister_list.php">
                      tn.gov.in
                    </SourceLink>
                    .
                  </>
                }
              />
            </GovernmentSearchProvider>
          }
        >
          <Route index element={<MinistersPage />} />
        </Route>
        <Route
          path="/departments"
          element={
            <GovernmentSearchProvider>
              <AppLayout
                fillViewport
                title="Departments"
                description={
                  <>
                    Tamil Nadu government departments from{" "}
                    <SourceLink href="https://www.tn.gov.in/department_list.php">
                      tn.gov.in
                    </SourceLink>
                    .
                  </>
                }
              />
            </GovernmentSearchProvider>
          }
        >
          <Route index element={<DepartmentsPage />} />
        </Route>
        <Route
          path="/districts"
          element={
            <DistrictSearchProvider>
              <AppLayout
                fillViewport
                title="Districts"
                description={
                  <>
                    Tamil Nadu district profiles from{" "}
                    <SourceLink href="https://www.tn.gov.in/district_list.php">
                      tn.gov.in
                    </SourceLink>
                    .
                  </>
                }
              />
            </DistrictSearchProvider>
          }
        >
          <Route index element={<DistrictsPage />} />
        </Route>
        <Route
          path="/constituencies"
          element={
            <ConstituencySearchProvider>
              <AppLayout
                fillViewport
                title="Constituencies"
                description={
                  <>
                    17th Tamil Nadu Legislative Assembly constituencies from{" "}
                    <SourceLink href="https://assembly.tn.gov.in/17thassembly_members.php">
                      assembly.tn.gov.in
                    </SourceLink>
                    .
                  </>
                }
              />
            </ConstituencySearchProvider>
          }
        >
          <Route index element={<ConstituenciesPage />} />
        </Route>
        <Route
          path="/magazine"
          element={
            <MagazineSearchProvider>
              <AppLayout
                title="Magazine"
                description={
                  <>
                    Tamil Arasu magazine issues from the{" "}
                    <SourceLink href="https://tamildigitallibrary.in/book-search-new?sub_cat_id=36&cat_id=21&sub_cat_name=%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AE%B0%E0%AE%9A%E0%AF%81">
                      Tamil Digital Library
                    </SourceLink>
                    . Click a tile to open the PDF in a new tab.
                  </>
                }
              />
            </MagazineSearchProvider>
          }
        >
          <Route index element={<MagazinePage />} />
        </Route>
        <Route
          path="/govt-schemes"
          element={
            <GovtSchemesSearchProvider>
              <AppLayout
                fillViewport
                title="Govt Schemes"
                description={
                  <>
                    Tamil Nadu state government schemes, housing, and scholarships from{" "}
                    <SourceLink href="https://schemesinindia.in/schemes/tamil-nadu">
                      Schemes in India
                    </SourceLink>
                    .
                  </>
                }
              />
            </GovtSchemesSearchProvider>
          }
        >
          <Route index element={<GovtSchemesPage />} />
        </Route>
        <Route
          path="/tvk-manifesto"
          element={
            <TVKManifestoSearchProvider>
              <AppLayout
                fillViewport
                title="TVK Manifesto"
                description="Tamilaga Vetri Kazhagam election manifesto, grouped by category and section."
              />
            </TVKManifestoSearchProvider>
          }
        >
          <Route index element={<TVKManifestoPage />} />
        </Route>
        <Route
          path="/news"
          element={
            <NewsSearchProvider>
              <AppLayout
                fillViewport
                title="Tamil Nadu News"
                description={
                  <>
                    Tamil Nadu news via{" "}
                    <SourceLink href="https://newsdata.io/">NewsData.io</SourceLink>.
                  </>
                }
              />
            </NewsSearchProvider>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoading label="Loading news…" />}>
                <NewsPage />
              </Suspense>
            }
          />
        </Route>
        <Route
          path="/about"
          element={
            <AppLayout
              fillViewport
              title="About"
              description={
                <>
                  Project information and data sources from{" "}
                  <SourceLink href="https://www.tn.gov.in/">tn.gov.in</SourceLink> and{" "}
                  <SourceLink href="https://dipr.tn.gov.in/">DIPR</SourceLink>.
                </>
              }
            />
          }
        >
          <Route index element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
