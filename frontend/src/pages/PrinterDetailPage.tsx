import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchPrinterHistory } from "../api";
import { PrintHistoryRecord, PrinterSnapshot, PrinterState } from "../types";

interface PrinterDetailPageProps {
  printer: PrinterSnapshot | undefined;
  loading: boolean;
}

function formatTemperature(value: number | null): string {
  return value === null ? "--" : `${Math.round(value)}°C`;
}

function formatDuration(seconds: number): string {
  const roundedMinutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} godz.` : `${hours} godz. ${minutes} min`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL");
}

function getStatusBadge(summaryStatus: PrinterSnapshot["state"]["summaryStatus"]): string {
  switch (summaryStatus) {
    case "printing":
      return "border-cyan-300/30 bg-cyan-400/15 text-cyan-200";
    case "error":
      return "border-rose-300/30 bg-rose-400/15 text-rose-200";
    case "offline":
      return "border-white/10 bg-white/10 text-slate-300";
    default:
      return "border-emerald-300/30 bg-emerald-400/15 text-emerald-200";
  }
}

export function PrinterDetailPage({ printer, loading }: PrinterDetailPageProps): JSX.Element {
  const [history, setHistory] = useState<PrintHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!printer) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void fetchPrinterHistory(printer.printer.id)
      .then((records) => {
        if (!cancelled) {
          setHistory(records);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setHistoryError(error instanceof Error ? error.message : "Nie udało się pobrać historii wydruków.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [printer?.printer.id]);

  if (loading && !printer) {
    return <p className="text-sm text-[var(--color-muted)]">Ładowanie danych drukarki...</p>;
  }

  if (!printer) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <h2 className="text-2xl font-semibold">Nie znaleziono drukarki</h2>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Urządzenie nie istnieje albo zostało usunięte.</p>
        <Link className="mt-6 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-3 text-sm text-cyan-100" to="/">
          Wróć do listy drukarek
        </Link>
      </section>
    );
  }

  const { state } = printer;
  const isPrinting = state.activityStatus === "printing";
  const elapsedTime = state.currentTicks === null ? null : formatDuration(state.currentTicks);
  const remainingTime =
    state.currentTicks === null || state.totalTicks === null
      ? null
      : formatDuration(Math.max(0, state.totalTicks - state.currentTicks));
  const temperatureCards: Array<{ label: string; temperature: PrinterState["temperatures"]["nozzle"] }> = [
    { label: "Dysza", temperature: state.temperatures.nozzle },
    { label: "Stół", temperature: state.temperatures.bed },
    { label: "Komora", temperature: state.temperatures.chamber }
  ];

  return (
    <section className="space-y-6">
      <Link className="inline-flex text-sm text-cyan-200 transition hover:text-cyan-100" to="/">
        ← Wróć do listy drukarek
      </Link>

      <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-muted)]">Szczegóły drukarki</p>
            <h2 className="mt-3 text-3xl font-semibold">{state.displayName}</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{state.machineName ?? "Nieznany model"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${getStatusBadge(state.summaryStatus)}`}>
              {state.summaryStatus}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-[var(--color-muted)]">
              {state.connected ? "Połączona" : "Rozłączona"} · {state.activityStatus}
            </span>
          </div>
        </div>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Mainboard ID", state.mainboardId],
            ["Adres IP", state.ipAddress],
            ["Firmware", state.firmwareVersion ?? "--"],
            ["Protokół", state.protocolVersion ?? "--"],
            ["Ostatnia wiadomość", formatDate(state.lastMessageAt)],
            ["Źródło rejestracji", printer.printer.source]
          ].map(([label, value]) => (
            <div className="rounded-2xl bg-white/5 p-4" key={label}>
              <dt className="text-[var(--color-muted)]">{label}</dt>
              <dd className="mt-2 break-all font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {isPrinting ? (
        <div className="rounded-3xl border border-cyan-300/20 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Bieżący wydruk</p>
          <h3 className="mt-3 break-all text-xl font-medium">{state.currentFileName ?? "Nieznany plik"}</h3>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-[var(--color-muted)]">Postęp</p>
              <p className="mt-2 text-2xl font-semibold">{state.progressPercent === null ? "--" : `${state.progressPercent}%`}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-[var(--color-muted)]">Warstwy</p>
              <p className="mt-2 text-2xl font-semibold">{state.currentLayer ?? "--"} / {state.totalLayers ?? "--"}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-[var(--color-muted)]">Czas wydruku</p>
              <p className="mt-2 font-medium">{elapsedTime === null ? "--" : `Trwa ${elapsedTime}`}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="text-sm text-[var(--color-muted)]">Szacowany koniec</p>
              <p className="mt-2 font-medium">{remainingTime === null ? "--" : `Za ${remainingTime}`}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {temperatureCards.map(({ label, temperature }) => (
              <div className="rounded-2xl bg-white/5 p-4" key={label}>
                <p className="text-sm text-[var(--color-muted)]">{label}</p>
                <p className="mt-2 text-xl font-semibold">{formatTemperature(temperature.actual)}</p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">Cel {formatTemperature(temperature.target)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">Historia</p>
        <h3 className="mt-3 text-xl font-medium">Zakończone zadania</h3>

        {historyLoading ? <p className="mt-6 text-sm text-[var(--color-muted)]">Ładowanie historii...</p> : null}
        {historyError ? <p className="mt-6 text-sm text-rose-200">{historyError}</p> : null}
        {!historyLoading && !historyError && history.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--color-muted)]">Brak zapisanej historii wydruków dla tej drukarki.</p>
        ) : null}

        {!historyLoading && !historyError && history.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-white/10 text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-3 font-medium">Plik</th>
                  <th className="px-3 py-3 font-medium">Rozpoczęcie</th>
                  <th className="px-3 py-3 font-medium">Zakończenie</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {history.map((record) => (
                  <tr key={record.id}>
                    <td className="px-3 py-4 font-medium">{record.file_name}</td>
                    <td className="px-3 py-4 text-[var(--color-muted)]">{formatDate(record.started_at)}</td>
                    <td className="px-3 py-4 text-[var(--color-muted)]">{formatDate(record.finished_at)}</td>
                    <td className="px-3 py-4">{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
