const integerFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

export const formatInteger = (value: number) => integerFormatter.format(Math.round(value));

export const formatPercent = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export const formatScore = (value: number | null | undefined, digits = 3) =>
  value === null || value === undefined || Number.isNaN(value) ? "—" : value.toFixed(digits);

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const formatSeconds = (value: number) => (value < 1 ? `${(value * 1000).toFixed(0)} ms` : `${value.toFixed(1)} s`);

export const formatParamValue = (value: unknown) =>
  typeof value === "number" ? (Number.isInteger(value) ? String(value) : value.toPrecision(3)) : String(value);
