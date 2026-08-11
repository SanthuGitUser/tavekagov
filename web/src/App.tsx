import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ConstituencySearchProvider } from "@/context/ConstituencySearchContext";

import { AppLayout } from "@/components/layout/AppLayout";
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
import { GovernmentPage } from "@/pages/GovernmentPage";
import { DistrictsPage } from "@/pages/DistrictsPage";
import { GovPressReleasesPage } from "@/pages/GovPressReleasesPage";
import { GovtSchemesPage } from "@/pages/GovtSchemesPage";
import { GovernmentOrdersPage } from "@/pages/GovernmentOrdersPage";
import { HomePage } from "@/pages/HomePage";
import { MagazinePage } from "@/pages/MagazinePage";
import { NewsPage } from "@/pages/NewsPage";
import { PressReleasesPage } from "@/pages/PressReleasesPage";
import { TVKManifestoPage } from "@/pages/TVKManifestoPage";
import { TransfersPostingsPage } from "@/pages/TransfersPostingsPage";

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
                description="Overview of Tamil Nadu government open data from bundled JSON feeds."
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
                  description="DIPR press releases with department from dipr.tn.gov.in."
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
                  description="Tamil Nadu government press release images from tn.gov.in."
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
                  description="Department G.O.s with searchable subjects and PDF links."
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
                description="IAS transfers and postings with name, old post, new post parsed from G.O. PDFs."
              />
            </TransfersPostingsSearchProvider>
          }
        >
          <Route index element={<TransfersPostingsPage />} />
        </Route>
        <Route
          path="/departments"
          element={
            <GovernmentSearchProvider>
              <AppLayout
                fillViewport
                title="Government"
                description="Tamil Nadu council of ministers and their departments."
              />
            </GovernmentSearchProvider>
          }
        >
          <Route index element={<GovernmentPage />} />
        </Route>
        <Route path="/ministers" element={<Navigate to="/departments" replace />} />
        <Route
          path="/districts"
          element={
            <DistrictSearchProvider>
              <AppLayout fillViewport hidePageHeader title="Districts" />
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
                description="17th Tamil Nadu Legislative Assembly constituencies from assembly.tn.gov.in."
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
                    <a
                      href="https://tamildigitallibrary.in/book-search-new?sub_cat_id=36&cat_id=21&sub_cat_name=%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AE%B0%E0%AE%9A%E0%AF%81"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Tamil Digital Library
                    </a>
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
                    <a
                      href="https://schemesinindia.in/schemes/tamil-nadu"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Schemes in India
                    </a>
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
                title="Tamil Nadu News"
                description="Tamil Nadu news via NewsData.io"
              />
            </NewsSearchProvider>
          }
        >
          <Route index element={<NewsPage />} />
        </Route>
        <Route
          path="/about"
          element={
            <AppLayout
              fillViewport
              title="About"
              description="Project information and data sources."
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
