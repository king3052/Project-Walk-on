type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: "accent" | "muted" | "warn";
};

const accentMap = {
  accent: "text-accent",
  muted: "text-fg",
  warn: "text-warn",
};

export function StatCard({ label, value, sub, accent = "muted" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
      <div className="text-xs tracking-wide text-fg-dim">{label}</div>
      <div className={`font-display text-3xl leading-none tabular-nums mt-1.5 ${accentMap[accent]}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

export function Section({ title, children }: SectionProps) {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </section>
  );
}
