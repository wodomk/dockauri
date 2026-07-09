import { FormEvent, useEffect, useState } from "react";

import { PrinterSnapshot, SettingsPayload } from "../types";

interface SettingsPageProps {
  printers: PrinterSnapshot[];
  settings: SettingsPayload;
  loading: boolean;
  settingsPending: boolean;
  deletePendingPrinterId: number | null;
  onSaveSettings: (discoveryIntervalSeconds: number) => Promise<void>;
  onDeletePrinter: (printerId: number) => Promise<void>;
}

export function SettingsPage({
  printers,
  settings,
  loading,
  settingsPending,
  deletePendingPrinterId,
  onSaveSettings,
  onDeletePrinter
}: SettingsPageProps): JSX.Element {
  const [discoveryIntervalSeconds, setDiscoveryIntervalSeconds] = useState(settings.discoveryIntervalSeconds);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  useEffect(() => {
    setDiscoveryIntervalSeconds(settings.discoveryIntervalSeconds);
  }, [settings.discoveryIntervalSeconds]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalMessage(null);

    try {
      await onSaveSettings(discoveryIntervalSeconds);
      setLocalMessage("Interwał discovery został zapisany.");
    } catch (error) {
      setLocalMessage(error instanceof Error ? error.message : "Nie udało się zapisać ustawień.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-muted)]">Route</p>
        <h2 className="text-3xl font-semibold">Ustawienia</h2>
        <p className="max-w-2xl text-sm text-[var(--color-muted)]">
          Ten ekran zapisuje już interwał discovery do bazy danych i pozwala zarządzać listą zarejestrowanych drukarek.
        </p>
      </div>

      <form className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]" onSubmit={handleSubmit}>
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">Discovery</p>
        <h3 className="mt-3 text-xl font-medium">Cykliczne skanowanie</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Interwał wpływa na to, jak często backend ponawia broadcast SDCP i aktualizuje adresy drukarek.
        </p>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end">
          <label className="flex-1 space-y-2">
            <span className="text-sm text-[var(--color-muted)]">Interwał w sekundach</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm outline-none transition focus:border-cyan-300/50"
              min={5}
              onChange={(event) => setDiscoveryIntervalSeconds(Number(event.target.value))}
              type="number"
              value={discoveryIntervalSeconds}
            />
          </label>

          <button
            className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={settingsPending}
            type="submit"
          >
            {settingsPending ? "Zapisywanie..." : "Zapisz"}
          </button>
        </div>

        {localMessage ? <p className="mt-4 text-sm text-[var(--color-muted)]">{localMessage}</p> : null}
      </form>

      <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">Drukarki</p>
        <h3 className="mt-3 text-xl font-medium">Zarejestrowane urządzenia</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Lista korzysta z tego samego rejestru SQLite, z którego backend utrzymuje połączenia WebSocket.
        </p>

        <div className="mt-6 space-y-3">
          {loading ? <p className="text-sm text-[var(--color-muted)]">Ładowanie drukarek...</p> : null}

          {!loading && printers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Brak zarejestrowanych drukarek.</p>
          ) : null}

          {printers.map((snapshot) => (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between" key={snapshot.printer.id}>
              <div>
                <h4 className="text-base font-medium">{snapshot.state.displayName}</h4>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {snapshot.printer.last_known_ip} • {snapshot.printer.source} • {snapshot.state.summaryStatus}
                </p>
              </div>

              <button
                className="rounded-full border border-rose-300/25 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deletePendingPrinterId === snapshot.printer.id}
                onClick={() => void onDeletePrinter(snapshot.printer.id)}
                type="button"
              >
                {deletePendingPrinterId === snapshot.printer.id ? "Usuwanie..." : "Usuń"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">Autentykacja</p>
          <h3 className="mt-3 text-xl font-medium">Placeholder</h3>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Ta sekcja czeka na osobny prompt poświęcony trybom logowania i zarządzaniu hasłami.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">Wygląd</p>
          <h3 className="mt-3 text-xl font-medium">Placeholder</h3>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Ta sekcja czeka na osobny prompt poświęcony przełącznikowi motywu i docelowemu designowi.
          </p>
        </div>
      </div>
    </section>
  );
}
