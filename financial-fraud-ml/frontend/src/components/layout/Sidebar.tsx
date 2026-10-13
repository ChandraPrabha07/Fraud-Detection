import { NavLink } from "react-router-dom";
import { ApiStatus } from "./ApiStatus";
import { NAV_ITEMS } from "./navigation";

export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent" aria-hidden>
          ⛨
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">Fraud Sentinel</p>
          <p className="text-[11px] text-ink-muted">ML risk intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                isActive ? "bg-accent-soft font-medium text-ink" : "text-ink-secondary hover:bg-surface-hover hover:text-ink"
              }`
            }
          >
            <span className="w-4 text-center text-ink-muted" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <ApiStatus />
      </div>
    </aside>
  );
}
