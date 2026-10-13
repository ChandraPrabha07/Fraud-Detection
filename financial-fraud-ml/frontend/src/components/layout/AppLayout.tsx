import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { LoadingState } from "../ui/States";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-page">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-page/90 px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" className="btn-ghost px-2.5 py-1.5" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            ☰
          </button>
          <span className="text-sm font-semibold">Fraud Sentinel</span>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Suspense fallback={<LoadingState label="Loading page…" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
