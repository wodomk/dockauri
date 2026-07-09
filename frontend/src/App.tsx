import { Link, Route, Routes } from "react-router-dom";

import { PrintersPage } from "./pages/PrintersPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="border-b border-white/10 bg-[var(--color-panel)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">Dockauri</p>
            <h1 className="mt-2 text-2xl font-semibold">Panel Elegoo SDCP</h1>
          </div>
          <nav className="flex gap-3 text-sm">
            <Link className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-400/60 hover:text-cyan-300" to="/">
              Drukarki
            </Link>
            <Link className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-400/60 hover:text-cyan-300" to="/settings">
              Ustawienia
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<PrintersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
