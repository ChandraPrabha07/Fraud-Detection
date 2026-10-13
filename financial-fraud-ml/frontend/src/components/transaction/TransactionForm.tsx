import type { FormEvent } from "react";
import type { SampleTransaction, TransactionFeatures } from "../../types/api";

export const FEATURE_NAMES = ["Time", ...Array.from({ length: 28 }, (_, i) => `V${i + 1}`), "Amount"];

export const emptyFeatures = (): Record<string, string> =>
  Object.fromEntries(FEATURE_NAMES.map((name) => [name, name === "Amount" ? "100" : "0"]));

interface TransactionFormProps {
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  onSubmit: (features: TransactionFeatures) => void;
  samples: SampleTransaction[];
  samplesLoading?: boolean;
  submitting: boolean;
}

/** Returns parsed features or a map of field -> error message. */
export function parseFeatures(values: Record<string, string>): { features?: TransactionFeatures; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const features: TransactionFeatures = {};
  for (const name of FEATURE_NAMES) {
    const raw = values[name]?.trim() ?? "";
    const parsed = Number(raw);
    if (raw === "" || !Number.isFinite(parsed)) errors[name] = "Enter a number";
    else if ((name === "Amount" || name === "Time") && parsed < 0) errors[name] = "Must be ≥ 0";
    else features[name] = parsed;
  }
  return Object.keys(errors).length ? { errors } : { features, errors };
}

export function TransactionForm({ values, onChange, onSubmit, samples, samplesLoading, submitting }: TransactionFormProps) {
  const { errors } = parseFeatures(values);
  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const { features } = parseFeatures(values);
    if (features) onSubmit(features);
  };

  const loadSample = (id: string) => {
    const sample = samples.find((s) => s.id === id);
    if (sample) {
      onChange(Object.fromEntries(FEATURE_NAMES.map((n) => [n, String(sample.features[n] ?? 0)])));
    }
  };

  const field = (name: string, label = name) => (
    <label key={name} className="block">
      <span className="mb-1 block text-xs text-ink-muted">{label}</span>
      <input
        className={`input-field tabular ${errors[name] ? "border-status-critical" : ""}`}
        inputMode="decimal"
        value={values[name] ?? ""}
        onChange={(e) => onChange({ ...values, [name]: e.target.value })}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      {errors[name] && (
        <span id={`${name}-error`} className="mt-0.5 block text-[11px] text-status-critical">
          {errors[name]}
        </span>
      )}
    </label>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[220px] flex-1">
          <span className="mb-1 block text-xs text-ink-muted">Load a held-out test transaction</span>
          <select className="input-field" defaultValue="" onChange={(e) => loadSample(e.target.value)}>
            <option value="" disabled>
              {samplesLoading ? "Loading samples…" : samples.length ? "Choose a sample…" : "No samples available"}
            </option>
            {samples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-ghost" onClick={() => onChange(emptyFeatures())}>
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        {field("Amount", "Amount (€)")}
        {field("Time", "Time (s since first txn)")}
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-medium text-ink-secondary">
          Anonymised PCA features V1–V28
        </legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {FEATURE_NAMES.filter((n) => n.startsWith("V")).map((n) => field(n))}
        </div>
      </fieldset>

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting || hasErrors}>
        {submitting ? "Scoring…" : "Predict fraud"}
      </button>
    </form>
  );
}
