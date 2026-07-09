import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { addPrinter, createPrinterSocket, deletePrinter, fetchPrinters, fetchSettings, saveSettings } from "./api";
import { PrintersPage } from "./pages/PrintersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FrontendSocketMessage, PrinterSnapshot, SettingsPayload } from "./types";

export default function App(): JSX.Element {
  const [printers, setPrinters] = useState<PrinterSnapshot[]>([]);
  const [settings, setSettings] = useState<SettingsPayload>({ discoveryIntervalSeconds: 60 });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [settingsPending, setSettingsPending] = useState(false);
  const [deletePendingPrinterId, setDeletePendingPrinterId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      setLoading(true);
      setPageError(null);

      try {
        const [printerSnapshots, settingsPayload] = await Promise.all([fetchPrinters(), fetchSettings()]);
        if (!cancelled) {
          setPrinters(printerSnapshots);
          setSettings(settingsPayload);
        }
      } catch (error) {
        if (!cancelled) {
          setPageError(error instanceof Error ? error.message : "Nie udało się pobrać danych startowych.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = createPrinterSocket((message) => {
      handleSocketMessage(message);
    });

    return () => {
      socket.close();
    };
  }, []);

  const printerCountLabel = useMemo(() => `${printers.length} drukarek`, [printers.length]);

  const handleSocketMessage = (message: FrontendSocketMessage) => {
    switch (message.type) {
      case "initial-state":
        setPrinters(message.payload);
        return;
      case "printer-state":
        setPrinters((current) =>
          current.some((snapshot) => snapshot.printer.id === message.payload.printer.id)
            ? current.map((snapshot) => (snapshot.printer.id === message.payload.printer.id ? message.payload : snapshot))
            : [...current, message.payload]
        );
        return;
      case "printer-removed":
        setPrinters((current) => current.filter((snapshot) => snapshot.printer.id !== message.payload.printerId));
        return;
      default:
        return;
    }
  };

  const handleAddPrinter = async (ipAddress: string) => {
    setAddPending(true);
    setPageError(null);

    try {
      const snapshot = await addPrinter(ipAddress);
      setPrinters((current) => {
        const alreadyExists = current.some((item) => item.printer.id === snapshot.printer.id);
        if (alreadyExists) {
          return current.map((item) => (item.printer.id === snapshot.printer.id ? snapshot : item));
        }

        return [...current, snapshot];
      });
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Nie udało się dodać drukarki.");
      throw error;
    } finally {
      setAddPending(false);
    }
  };

  const handleDeletePrinter = async (printerId: number) => {
    setDeletePendingPrinterId(printerId);
    setPageError(null);

    try {
      await deletePrinter(printerId);
      setPrinters((current) => current.filter((snapshot) => snapshot.printer.id !== printerId));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Nie udało się usunąć drukarki.");
    } finally {
      setDeletePendingPrinterId(null);
    }
  };

  const handleSaveSettings = async (discoveryIntervalSeconds: number) => {
    setSettingsPending(true);
    setPageError(null);

    try {
      const nextSettings = await saveSettings(discoveryIntervalSeconds);
      setSettings(nextSettings);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Nie udało się zapisać ustawień.");
      throw error;
    } finally {
      setSettingsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)]">
      <header className="border-b border-white/10 bg-[var(--color-panel)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">Dockauri</p>
            <h1 className="mt-2 text-2xl font-semibold">Panel Elegoo SDCP</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{printerCountLabel}</p>
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
        {pageError ? (
          <div className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {pageError}
          </div>
        ) : null}

        <Routes>
          <Route
            path="/"
            element={<PrintersPage printers={printers} loading={loading} addPending={addPending} onAddPrinter={handleAddPrinter} />}
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                printers={printers}
                settings={settings}
                loading={loading}
                settingsPending={settingsPending}
                deletePendingPrinterId={deletePendingPrinterId}
                onSaveSettings={handleSaveSettings}
                onDeletePrinter={handleDeletePrinter}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
