import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { ErrorFallback } from './components/shared/ErrorFallback';
import { PageSkeleton } from './components/shared/PageSkeleton';

const Home = React.lazy(() => import('./pages/Home'));
const ServerList = React.lazy(() => import('./pages/ServerList'));
const ServerDetail = React.lazy(() => import('./pages/ServerDetail'));
const Browse = React.lazy(() => import('./pages/Browse'));
const OurTools = React.lazy(() => import('./pages/OurTools'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const More = React.lazy(() => import('./pages/More'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Home />
            </motion.div>
          }
        />
        <Route
          path="/servers"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ServerList />
            </motion.div>
          }
        />
        <Route
          path="/servers/:name"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ServerDetail />
            </motion.div>
          }
        />
        <Route
          path="/browse"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Browse />
            </motion.div>
          }
        />
        <Route
          path="/our-tools"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <OurTools />
            </motion.div>
          }
        />
        <Route
          path="/favorites"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Favorites />
            </motion.div>
          }
        />
        <Route
          path="/more"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <More />
            </motion.div>
          }
        />
        <Route
          path="*"
          element={
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <NotFound />
            </motion.div>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to main content
        </a>
        <Navbar />
        <main id="main-content">
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatedRoutes />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
