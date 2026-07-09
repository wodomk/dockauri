export function PrintersPage(): JSX.Element {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.25em] text-[var(--color-muted)]">Route</p>
        <h2 className="text-3xl font-semibold">Lista drukarek</h2>
        <p className="max-w-2xl text-sm text-[var(--color-muted)]">
          Widok główny jest gotowy pod późniejsze karty drukarek, live status i podgląd kamery.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
          <p className="text-sm text-[var(--color-muted)]">Placeholder</p>
          <h3 className="mt-3 text-xl font-medium">Karty drukarek</h3>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Tu pojawią się urządzenia odkryte przez backend oraz ich bieżący stan.
          </p>
        </div>
      </div>
    </section>
  );
}
