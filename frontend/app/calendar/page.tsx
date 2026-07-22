"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import {
  getScheduledWorkouts,
  createScheduledWorkout,
  toggleScheduledWorkoutComplete,
  deleteScheduledWorkout,
  seedWeekFromTemplate,
  type ScheduledWorkout,
} from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

const WORKOUT_TYPES = [
  "Basketball",
  "Serve",
  "Groundstrokes",
  "Footwork",
  "Strength",
  "Strength & Conditioning",
  "Conditioning",
  "Nutrition",
  "Recovery",
  "Film",
  "Analytics",
  "Goals",
  "Mental",
  "Life",
  "Planning",
  "Journal",
  "Rest",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildGrid(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstWeekday + 1;
    cells.push(dayNum >= 1 && dayNum <= daysInMonth ? new Date(year, month, dayNum) : null);
  }
  return cells;
}

export default function CalendarPage() {
  const { userId } = useAuth();
  const today = new Date();
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(today));
  const [workoutType, setWorkoutType] = useState(WORKOUT_TYPES[0]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  function loadMonth() {
    if (!userId) return;
    const start = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
    const end = toISODate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
    getScheduledWorkouts(userId, start, end)
      .then(setWorkouts)
      .catch(() => setWorkouts([]));
  }

  useEffect(loadMonth, [monthDate]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setPending(true);
    setError(null);
    try {
      await createScheduledWorkout(userId, selectedDate, workoutType, title, notes || undefined);
      setTitle("");
      setNotes("");
      loadMonth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function onToggle(id: string) {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w)));
    try {
      await toggleScheduledWorkoutComplete(id);
    } catch {
      setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w))); // revert
    }
  }

  async function onDelete(id: string) {
    const prevWorkouts = workouts;
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await deleteScheduledWorkout(id);
    } catch {
      setWorkouts(prevWorkouts); // revert
    }
  }

  async function onSeedWeek() {
    setSeeding(true);
    setSeedStatus(null);
    try {
      const selected = new Date(selectedDate + "T00:00:00");
      const weekday = selected.getDay(); // 0 = Sunday
      const sunday = new Date(selected);
      sunday.setDate(selected.getDate() - weekday);
      const result = await seedWeekFromTemplate(toISODate(sunday));
      setSeedStatus(
        result.created > 0
          ? `Added ${result.created} items from your template.`
          : "That week already has your template loaded."
      );
      loadMonth();
    } catch (err) {
      setSeedStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSeeding(false);
    }
  }

  const cells = buildGrid(monthDate);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayISO = toISODate(today);
  const dayWorkouts = workouts.filter((w) => w.date === selectedDate);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <PageHeader
        title="Calendar"
        description="Schedule what to train and when — click a day to add or review workouts."
      />

      <div className="flex items-center justify-between">
        <button
          onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          className="text-sm text-fg-dim hover:text-fg-muted transition-colors px-3 py-1"
        >
          ← Prev
        </button>
        <p className="font-display text-xl text-fg">{monthLabel}</p>
        <button
          onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          className="text-sm text-fg-dim hover:text-fg-muted transition-colors px-3 py-1"
        >
          Next →
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onSeedWeek}
            disabled={seeding}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-2 rounded-md transition-colors"
          >
            {seeding ? "Loading…" : "Load this week's template"}
          </button>
          <a href="/template" className="text-xs text-fg-dim hover:text-accent transition-colors">
            Edit template
          </a>
        </div>
        {seedStatus && <p className="text-xs text-fg-dim">{seedStatus}</p>}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-xs text-fg-dim text-center pb-1">
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const iso = toISODate(date);
          const dayItems = workouts.filter((w) => w.date === iso);
          const isSelected = iso === selectedDate;
          const isToday = iso === todayISO;
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(iso)}
              className={`aspect-square rounded-md border p-1.5 text-left flex flex-col overflow-hidden transition-colors ${
                isSelected
                  ? "border-accent bg-surface-panel"
                  : "border-surface-border bg-surface-panel hover:bg-surface-panelHover"
              }`}
            >
              <span className={`text-xs ${isToday ? "text-accent" : "text-fg-dim"}`}>{date.getDate()}</span>
              <div className="mt-1 space-y-0.5 overflow-hidden">
                {dayItems.slice(0, 2).map((w) => (
                  <p
                    key={w.id}
                    className={`text-[10px] truncate ${w.completed ? "text-fg-dim line-through" : "text-fg-muted"}`}
                  >
                    {w.title}
                  </p>
                ))}
                {dayItems.length > 2 && <p className="text-[10px] text-fg-dim">+{dayItems.length - 2} more</p>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">{selectedDate}</h2>
          {dayWorkouts.length === 0 && <p className="text-sm text-fg-dim">Nothing scheduled.</p>}
          <ul className="space-y-2">
            {dayWorkouts.map((w) => (
              <li key={w.id} className="flex items-start gap-3">
                <button
                  onClick={() => onToggle(w.id)}
                  className={`h-4 w-4 mt-0.5 shrink-0 rounded border ${
                    w.completed ? "bg-accent border-accent" : "border-surface-border"
                  }`}
                />
                <div className="flex-1">
                  <p className={`text-sm ${w.completed ? "text-fg-dim line-through" : "text-fg"}`}>{w.title}</p>
                  <p className="text-xs text-fg-dim">
                    {w.workout_type}
                    {w.notes ? ` — ${w.notes}` : ""}
                  </p>
                </div>
                <button onClick={() => onDelete(w.id)} className="text-xs text-fg-dim hover:text-warn">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onAdd} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim">Add to {selectedDate}</h2>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Type</label>
            <select value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} className={inputClass}>
              {WORKOUT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lower body strength"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={2} />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
          >
            {pending ? "Adding…" : "Add to calendar"}
          </button>
          {error && <p className="text-warn text-sm">{error}</p>}
        </form>
      </div>
    </main>
  );
}
