import { useApi } from "../../hooks/useApi";
import { fraudApi } from "../../services/fraudApi";
import { STATUS_COLORS } from "../charts/chartTheme";

export function ApiStatus() {
  const { data, error, loading } = useApi(fraudApi.health);

  const [color, label] = loading
    ? [STATUS_COLORS.warning, "Connecting…"]
    : error
      ? [STATUS_COLORS.critical, "API offline"]
      : data?.status === "ok"
        ? [STATUS_COLORS.good, `API online · ${data.models_loaded.length} models`]
        : [STATUS_COLORS.warning, "API degraded — train models"];

  return (
    <div className="flex items-center gap-2 text-xs text-ink-secondary" title={error ?? data?.warnings.join("\n")}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </div>
  );
}
