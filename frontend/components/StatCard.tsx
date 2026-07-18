type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: "hardwood" | "green" | "red";
};

const accentMap = {
  hardwood: "text-hardwood-light",
  green: "text-scoreboard-green",
  red: "text-scoreboard-red",
};

export function StatCard({ label, value, sub, accent = "hardwood" }: StatCardProps) {
  return (
    <div className="rounded-md border border-court-line bg-court-panel px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-chalk-dim">{label}</div>
      <div className={`font-display text-4xl leading-none tabular-nums mt-1 ${accentMap[accent]}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-chalk-muted mt-1">{sub}</div>}
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
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display text-lg uppercase tracking-widest text-chalk-muted">
          {title}
        </h2>
        <div className="h-px flex-1 bg-court-line" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </section>
  );
}
