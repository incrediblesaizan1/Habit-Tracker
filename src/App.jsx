import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

// Lazy load pages for code-splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const JournalsPage = lazy(() => import("./pages/JournalsPage"));

const PageLoader = () => (
  <div className="loader-container">
    <div className="spinner" />
  </div>
);

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/journals" element={<JournalsPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
