import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PrinterSnapshot } from "../types";

interface PrintersPageProps {
  printers: PrinterSnapshot[];
  loading: boolean;
  addPending: boolean;
  onAddPrinter: (ipAddress: string) => Promise<void>;
}

function formatTemperature(value: number | null): string {
  return value === null ? "--" : `${Math.round(value)}°C`;
}

function getStatusBadge(summaryStatus: PrinterSnapshot["state"]["summaryStatus"]): string {
  switch (summaryStatus) {
    case "printing":
      return "bg-cyan-400/15 text-cyan-200 border-cyan-300/30";
    case "error":
      return "bg-rose-400/15 text-rose-200 border-rose-300/30";
    case "offline":
      return "bg-white/10 text-slate-300 border-white/10";
    default:
      return "bg-emerald-400/15 text-emerald-200 border-emerald-300/30";
  }
}

export function PrintersPage({ printers, loading, addPending, onAddPrinter }: PrintersPageProps): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const sortedPrinters = useMemo(
    () =>
      [...printers].sort((left, right) =>
        left.state.displayName.localeCompare(right.state.displayName, "pl", { sensitivity: "base" })
      ),
    [printers]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await onAddPrinter(ipAddress.trim());
      setIpAddress("");
      setModalOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Nie udało się dodać drukarki.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-muted)]">Route</p>
          <h2 className="text-3xl font-semibold">Lista drukarek</h2>
          <p className="max-w-2xl text-sm text-[var(--color-muted)]">
            Widok główny pokazuje już aktualny stan drukarek, temperatury i ręczne dodawanie urządzeń po IP.
          </p>
        </div>

        <button
          className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
          onClick={() => setModalOpen(true)}
          type="button"
        >
          Dodaj drukarkę
        </button>
      </div>

      {loading ? <div className="text-sm text-[var(--color-muted)]">Ładowanie drukarek...</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedPrinters.map((snapshot) => (
          <Link
            className="group block rounded-3xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            key={snapshot.printer.id}
            to={`/printers/${snapshot.printer.id}`}
          >
            <article className="h-full rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition group-hover:border-cyan-300/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{snapshot.printer.source}</p>
                <h3 className="mt-2 text-xl font-medium">{snapshot.state.displayName}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{snapshot.printer.last_known_ip}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${getStatusBadge(snapshot.state.summaryStatus)}`}>
                {snapshot.state.summaryStatus}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-[var(--color-muted)]">Postęp</p>
                <p className="mt-2 text-2xl font-semibold">
                  {snapshot.state.progressPercent === null ? "--" : `${snapshot.state.progressPercent}%`}
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{snapshot.state.currentFileName ?? "Brak aktywnego pliku"}</p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-[var(--color-muted)]">Warstwy</p>
                <p className="mt-2 text-2xl font-semibold">
                  {snapshot.state.currentLayer ?? "--"} / {snapshot.state.totalLayers ?? "--"}
                </p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{snapshot.state.activityStatus}</p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-[var(--color-muted)]">Dysza</p>
                <p className="mt-2 text-2xl font-semibold">{formatTemperature(snapshot.state.temperatures.nozzle.actual)}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  Cel {formatTemperature(snapshot.state.temperatures.nozzle.target)}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-[var(--color-muted)]">Stół</p>
                <p className="mt-2 text-2xl font-semibold">{formatTemperature(snapshot.state.temperatures.bed.actual)}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">Komora {formatTemperature(snapshot.state.temperatures.chamber.actual)}</p>
              </div>
            </div>

            {snapshot.state.errorMessage ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {snapshot.state.errorMessage}
              </div>
            ) : null}
            </article>
          </Link>
        ))}

        {!loading && sortedPrinters.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-sm text-[var(--color-muted)]">
            Brak zarejestrowanych drukarek. Dodaj pierwszą ręcznie po adresie IP albo poczekaj na discovery.
          </div>
        ) : null}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">Manual</p>
                <h3 className="mt-2 text-2xl font-semibold">Dodaj drukarkę po IP</h3>
              </div>
              <button className="text-sm text-[var(--color-muted)] transition hover:text-white" onClick={() => setModalOpen(false)} type="button">
                Zamknij
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm text-[var(--color-muted)]">Adres IP drukarki</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm outline-none transition focus:border-cyan-300/50"
                  onChange={(event) => setIpAddress(event.target.value)}
                  placeholder="192.168.1.120"
                  value={ipAddress}
                />
              </label>

              {formError ? <p className="text-sm text-rose-200">{formError}</p> : null}

              <div className="flex justify-end gap-3">
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-[var(--color-muted)] transition hover:text-white"
                  onClick={() => setModalOpen(false)}
                  type="button"
                >
                  Anuluj
                </button>
                <button
                  className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={addPending || ipAddress.trim() === ""}
                  type="submit"
                >
                  {addPending ? "Dodawanie..." : "Dodaj"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
