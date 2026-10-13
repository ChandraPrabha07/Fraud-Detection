import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";

// Route-level code splitting keeps the initial bundle small.
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const TransactionAnalysisPage = lazy(() =>
  import("./pages/TransactionAnalysisPage").then((m) => ({ default: m.TransactionAnalysisPage })),
);
const DimensionalityPage = lazy(() => import("./pages/DimensionalityPage").then((m) => ({ default: m.DimensionalityPage })));
const ModelComparisonPage = lazy(() => import("./pages/ModelComparisonPage").then((m) => ({ default: m.ModelComparisonPage })));
const SmoteRegularizationPage = lazy(() =>
  import("./pages/SmoteRegularizationPage").then((m) => ({ default: m.SmoteRegularizationPage })),
);
const BayesianRiskPage = lazy(() => import("./pages/BayesianRiskPage").then((m) => ({ default: m.BayesianRiskPage })));
const SequenceAnalysisPage = lazy(() => import("./pages/SequenceAnalysisPage").then((m) => ({ default: m.SequenceAnalysisPage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="transaction" element={<TransactionAnalysisPage />} />
          <Route path="dimensionality" element={<DimensionalityPage />} />
          <Route path="models" element={<ModelComparisonPage />} />
          <Route path="smote-regularization" element={<SmoteRegularizationPage />} />
          <Route path="bayesian" element={<BayesianRiskPage />} />
          <Route path="sequence" element={<SequenceAnalysisPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
