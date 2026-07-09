export function SettingsPage(): JSX.Element {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-muted)]">Route</p>
        <h2 className="text-3xl font-semibold">Ustawienia</h2>
        <p className="max-w-2xl text-sm text-[var(--color-muted)]">
          Ten ekran jest przygotowany pod przyszłą konfigurację discovery, autentykacji, wyglądu i drukarek.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <p className="text-sm text-[var(--color-muted)]">Placeholder</p>
        <h3 className="mt-3 text-xl font-medium">Sekcje ustawień</h3>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Docelowo dane z tego widoku będą trafiać do tabeli `settings` zamiast do plików konfiguracyjnych.
        </p>
      </div>
    </section>
  );
}
