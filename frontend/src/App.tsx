import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ScrollToTop } from "./components/layout/ScrollToTop";
import { ErrorFallback } from "./components/shared/ErrorFallback";
import { PageSkeleton } from "./components/shared/PageSkeleton";

const Home = React.lazy(() => import("./pages/Home"));
const ServerList = React.lazy(() => import("./pages/ServerList"));
const ServerDetail = React.lazy(() => import("./pages/ServerDetail"));
const Browse = React.lazy(() => import("./pages/Browse"));
const OurTools = React.lazy(() => import("./pages/OurTools"));
const More = React.lazy(() => import("./pages/More"));
const Categories = React.lazy(() => import("./pages/Categories"));
const Curated = React.lazy(() => import("./pages/Curated"));
const Companies = React.lazy(() => import("./pages/Companies"));
const Favorites = React.lazy(() => import("./pages/Favorites"));
const About = React.lazy(() => import("./pages/About"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const handleError = (error: unknown) => {
  console.error("Caught by ErrorBoundary:", error);
};

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");
  const handleReset = () => {
    const target = basename ? `${basename}/` : "/";
    window.location.href = target;
  };
  return (
    <Router basename={basename || undefined}>
      <ScrollToTop />
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={handleError}
        onReset={handleReset}
      >
        <div className="min-h-screen flex flex-col">
          {/* Skip link for keyboard users; visually hidden until focused.
              MUST be the first focusable element in the DOM (before the
              static-demo banner, Navbar, and any other content) so the
              very first Tab press lands on it. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1">
            <Suspense fallback={<PageSkeleton variant="default" />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Suspense fallback={<PageSkeleton variant="home" />}>
                      <Home />
                    </Suspense>
                  }
                />
                <Route
                  path="/servers"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <ServerList />
                    </Suspense>
                  }
                />
                <Route
                  path="/servers/:name"
                  element={
                    <Suspense fallback={<PageSkeleton variant="detail" />}>
                      <ServerDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="/browse"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <Browse />
                    </Suspense>
                  }
                />
                <Route
                  path="/our-tools"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <OurTools />
                    </Suspense>
                  }
                />
                <Route
                  path="/more"
                  element={
                    <Suspense fallback={<PageSkeleton variant="default" />}>
                      <More />
                    </Suspense>
                  }
                />
                {/* /submit was absorbed into /more in Phase 7; the
                    old route is kept as a redirect for one release
                    so old links don't 404. */}
                <Route
                  path="/submit"
                  element={
                    <Suspense fallback={<PageSkeleton variant="default" />}>
                      <More />
                    </Suspense>
                  }
                />
                <Route
                  path="/categories"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <Categories />
                    </Suspense>
                  }
                />
                <Route
                  path="/curated"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <Curated />
                    </Suspense>
                  }
                />
                <Route
                  path="/companies"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <Companies />
                    </Suspense>
                  }
                />
                <Route
                  path="/favorites"
                  element={
                    <Suspense fallback={<PageSkeleton variant="list" />}>
                      <Favorites />
                    </Suspense>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <Suspense fallback={<PageSkeleton variant="default" />}>
                      <About />
                    </Suspense>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<PageSkeleton variant="default" />}>
                      <NotFound />
                    </Suspense>
                  }
                />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </ErrorBoundary>
    </Router>
  );
}