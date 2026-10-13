import { useState } from "react";
import { PredictionResult } from "../components/transaction/PredictionResult";
import { TransactionForm, emptyFeatures } from "../components/transaction/TransactionForm";
import { Card } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { useApi, useMutation } from "../hooks/useApi";
import { fraudApi } from "../services/fraudApi";

export function TransactionAnalysisPage() {
  const [values, setValues] = useState<Record<string, string>>(emptyFeatures);
  const samples = useApi(fraudApi.sampleTransactions);
  const prediction = useMutation(fraudApi.predict);

  return (
    <>
      <PageHeader
        title="Transaction Analysis"
        description="Score a single transaction with every trained classifier. Inputs are raw (unscaled) values; the saved scaler is applied server-side."
      />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Card title="Transaction features">
          {samples.error && <p className="mb-3 text-xs text-status-warning">! Samples unavailable: {samples.error}</p>}
          <TransactionForm
            values={values}
            onChange={setValues}
            onSubmit={(features) => void prediction.run(features)}
            samples={samples.data?.samples ?? []}
            samplesLoading={samples.loading}
            submitting={prediction.loading}
          />
        </Card>

        <Card title="Fraud assessment" subtitle="Logistic Regression, SVM, Random Forest, Bagging, XGBoost and Stacking">
          {prediction.loading ? (
            <LoadingState label="Scoring transaction…" />
          ) : prediction.error ? (
            <ErrorState message={prediction.error} />
          ) : prediction.data ? (
            <PredictionResult result={prediction.data} />
          ) : (
            <EmptyState title="No prediction yet">Load a sample or enter features, then click “Predict fraud”.</EmptyState>
          )}
        </Card>
      </div>
    </>
  );
}
