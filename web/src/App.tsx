import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ConstituencySearchProvider } from "@/context/ConstituencySearchContext";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageLoading } from "@/components/shared/PageLoading";
import { SourceLink } from "@/components/shared/SourceLink";
import { DashboardDateRangeProvider } from "@/context/DashboardDateRangeContext";
import { GovernmentSearchProvider } from "@/context/GovernmentSearchContext";
import { DistrictSearchProvider } from "@/context/DistrictSearchContext";
import { DvacPressReleaseSearchProvider } from "@/context/DvacPressReleaseSearchContext";
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
import { DashboardPage } from "@/pages/DashboardPage";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const NewsPage = lazy(() =>
  import("@/pages/NewsPage").then((module) => ({ default: module.NewsPage })),
);
const PressReleasesPage = lazy(() =>
  import("@/pages/PressReleasesPage").then((module) => ({ default: module.PressReleasesPage })),
);
const DvacPressReleasesPage = lazy(() =>
  import("@/pages/DvacPressReleasesPage").then((module) => ({
    default: module.DvacPressReleasesPage,
  })),
);
const FinanceNotificationsPage = lazy(() =>
  import("@/pages/FinanceNotificationsPage").then((module) => ({
    default: module.FinanceNotificationsPage,
  })),
);
const GovPressReleasesPage = lazy(() =>
  import("@/pages/GovPressReleasesPage").then((module) => ({ default: module.GovPressReleasesPage })),
);
const GovernmentOrdersPage = lazy(() =>
  import("@/pages/GovernmentOrdersPage").then((module) => ({ default: module.GovernmentOrdersPage })),
);
const TransfersPostingsPage = lazy(() =>
  import("@/pages/TransfersPostingsPage").then((module) => ({ default: module.TransfersPostingsPage })),
);
const MinistersPage = lazy(() =>
  import("@/pages/MinistersPage").then((module) => ({ default: module.MinistersPage })),
);
const DepartmentsPage = lazy(() =>
  import("@/pages/DepartmentsPage").then((module) => ({ default: module.DepartmentsPage })),
);
const DistrictsPage = lazy(() =>
  import("@/pages/DistrictsPage").then((module) => ({ default: module.DistrictsPage })),
);
const ConstituenciesPage = lazy(() =>
  import("@/pages/ConstituenciesPage").then((module) => ({ default: module.ConstituenciesPage })),
);
const MagazinePage = lazy(() =>
  import("@/pages/MagazinePage").then((module) => ({ default: module.MagazinePage })),
);
const GovtSchemesPage = lazy(() =>
  import("@/pages/GovtSchemesPage").then((module) => ({ default: module.GovtSchemesPage })),
);
const TVKManifestoPage = lazy(() =>
  import("@/pages/TVKManifestoPage").then((module) => ({ default: module.TVKManifestoPage })),
);

function LazyRoute({
  children,
  label = "Loading…",
}: {
  children: ReactNode;
  label?: string;
}) {
  return <Suspense fallback={<PageLoading label={label} />}>{children}</Suspense>;
}

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
          <Route
            index
            element={
              <LazyRoute label="Loading press releases…">
                <PressReleasesPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path="/gov-press-releases"
          element={
            <GovPressReleaseSearchProvider>
              <GovPressReleaseViewProvider>
                <AppLayout
                  fillViewport
                  title="Press Release Images"
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
          <Route
            index
            element={
              <LazyRoute label="Loading press release images…">
                <GovPressReleasesPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path="/dvac-press-releases"
          element={
            <DvacPressReleaseSearchProvider>
              <AppLayout
                fillViewport
                title="DVAC Press Releases"
                description={
                  <>
                    Directorate of Vigilance and Anti-Corruption press releases from{" "}
                    <SourceLink href="https://www.dvac.tn.gov.in/Press_Release.html">
                      dvac.tn.gov.in
                    </SourceLink>
                    .
                  </>
                }
              />
            </DvacPressReleaseSearchProvider>
          }
        >
          <Route
            index
            element={
              <LazyRoute label="Loading DVAC press releases…">
                <DvacPressReleasesPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path="/finance-notifications"
          element={
            <AppLayout
              fillViewport
              title="Finance Notifications"
              description={
                <>
                  Downloads from the Finance Department homepage notifications widget on{" "}
                  <SourceLink href="https://financedept.tn.gov.in/en/">
                    financedept.tn.gov.in
                  </SourceLink>
                  .
                </>
              }
            />
          }
        >
          <Route
            index
            element={
              <LazyRoute label="Loading finance notifications…">
                <FinanceNotificationsPage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading government orders…">
                <GovernmentOrdersPage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading transfers and postings…">
                <TransfersPostingsPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route path="/government" element={<Navigate to="/ministers" replace />} />
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
          <Route
            index
            element={
              <LazyRoute label="Loading ministers…">
                <MinistersPage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading departments…">
                <DepartmentsPage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading districts…">
                <DistrictsPage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading constituencies…">
                <ConstituenciesPage />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path="/magazine"
          element={
            <MagazineSearchProvider>
              <AppLayout
                fillViewport
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
          <Route
            index
            element={
              <LazyRoute label="Loading magazine…">
                <MagazinePage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading government schemes…">
                <GovtSchemesPage />
              </LazyRoute>
            }
          />
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
          <Route
            index
            element={
              <LazyRoute label="Loading manifesto…">
                <TVKManifestoPage />
              </LazyRoute>
            }
          />
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
              <LazyRoute label="Loading news…">
                <NewsPage />
              </LazyRoute>
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
        <Route
          path="*"
          element={<AppLayout fillViewport title="Page not found" hidePageHeader />}
        >
          <Route index element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
