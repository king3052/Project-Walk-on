import { toLocalISODate } from "@/lib/date";

type ActivityCalendarProps = {
  activeDates: string[]; // "YYYY-MM-DD"
  days?: number;
};

export function ActivityCalendar({ activeDates, days = 84 }: ActivityCalendarProps) {
  const activeSet = new Set(activeDates);
  const today = new Date();
  const cells: { date: string; active: boolean }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = toLocalISODate(d);
    cells.push({ date: iso, active: activeSet.has(iso) });
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
      <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">Activity — last {days} days</h2>
      <div className="grid grid-cols-12 gap-1.5">
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={cell.date}
            className={`aspect-square rounded-sm ${cell.active ? "bg-accent" : "bg-surface-panelHover"}`}
          />
        ))}
      </div>
    </div>
  );
}
