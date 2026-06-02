import React, { Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { ErrorFallback } from "./components/shared/ErrorFallback";
import { PageSkeleton } from "./components/shared/PageSkeleton";

const Home = React.lazy(() => import("./pages/Home"));
const ServerList = React.lazy(() => import("./pages/ServerList"));
const ServerDetail = React.lazy(() => import("./pages/ServerDetail"));
const Categories = React.lazy(() => import("./pages/Categories"));
const Curated = React.lazy(() => import("./pages/Curated"));
const Companies = React.lazy(() => import("./pages/Companies"));
const Favorites = React.lazy(() => import("./pages/Favorites"));
const About = React.lazy(() => import("./pages/About"));
const SubmitServer = React.lazy(() => import("./pages/SubmitServer"));
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
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={handleError}
        onReset={handleReset}
      >
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
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
                  path="/submit"
                  element={
                    <Suspense fallback={<PageSkeleton variant="default" />}>
                      <SubmitServer />
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