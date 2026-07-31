import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { DepartmentSearchProvider } from "@/context/DepartmentSearchContext";
import { DistrictSearchProvider } from "@/context/DistrictSearchContext";
import { MinisterSearchProvider } from "@/context/MinisterSearchContext";
import { GovPressReleaseSearchProvider } from "@/context/GovPressReleaseSearchContext";
import { GovernmentOrdersSearchProvider } from "@/context/GovernmentOrdersSearchContext";
import { GovernmentOrdersViewProvider } from "@/context/GovernmentOrdersViewContext";
import { MagazineSearchProvider } from "@/context/MagazineSearchContext";
import { NewsSearchProvider } from "@/context/NewsSearchContext";
import { PressReleaseSearchProvider } from "@/context/PressReleaseSearchContext";
import { TransfersPostingsSearchProvider } from "@/context/TransfersPostingsSearchContext";
import { AboutPage } from "@/pages/AboutPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DepartmentsPage } from "@/pages/DepartmentsPage";
import { DistrictsPage } from "@/pages/DistrictsPage";
import { GovPressReleasesPage } from "@/pages/GovPressReleasesPage";
import { GovernmentOrdersPage } from "@/pages/GovernmentOrdersPage";
import { MagazinePage } from "@/pages/MagazinePage";
import { MinistersPage } from "@/pages/MinistersPage";
import { NewsPage } from "@/pages/NewsPage";
import { PressReleasesPage } from "@/pages/PressReleasesPage";
import { TransfersPostingsPage } from "@/pages/TransfersPostingsPage";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/"
          element={
            <AppLayout
              title="Dashboard"
              description="Overview of Tamil Nadu government open data from bundled JSON feeds."
            />
          }
        >
          <Route index element={<DashboardPage />} />
        </Route>
        <Route
          path="/press-releases"
          element={
            <PressReleaseSearchProvider>
              <AppLayout
                fillViewport
                title="Press Releases"
                description="DIPR press releases with department and type filters, searchable titles, and PDF links."
              />
            </PressReleaseSearchProvider>
          }
        >
          <Route index element={<PressReleasesPage />} />
        </Route>
        <Route
          path="/gov-press-releases"
          element={
            <GovPressReleaseSearchProvider>
              <AppLayout
                fillViewport
                title="PR Images"
                description="Tamil Nadu government press release images from tn.gov.in, browsable by date with CM visit, review meeting, and posting filters."
              />
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
                description="IAS transfer and posting G.O.s from tn.gov.in with PDF links."
              />
            </TransfersPostingsSearchProvider>
          }
        >
          <Route index element={<TransfersPostingsPage />} />
        </Route>
        <Route
          path="/departments"
          element={
            <DepartmentSearchProvider>
              <AppLayout
                title="Departments"
                description="Tamil Nadu government departments and ministers."
              />
            </DepartmentSearchProvider>
          }
        >
          <Route index element={<DepartmentsPage />} />
        </Route>
        <Route
          path="/ministers"
          element={
            <MinisterSearchProvider>
              <AppLayout
                title="Council of Ministers"
                description="Ministers, designations, and portfolios."
              />
            </MinisterSearchProvider>
          }
        >
          <Route index element={<MinistersPage />} />
        </Route>
        <Route
          path="/districts"
          element={
            <DistrictSearchProvider>
              <AppLayout
                title="Districts"
                description="District directory with population and website links."
              />
            </DistrictSearchProvider>
          }
        >
          <Route index element={<DistrictsPage />} />
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
          path="/news"
          element={
            <NewsSearchProvider>
              <AppLayout
                title="Tamil Nadu News"
                description="English-language Tamil Nadu news from thenewsminute.com and timesnownews.com."
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
