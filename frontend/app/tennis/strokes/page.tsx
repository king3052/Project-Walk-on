"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import { getStrokeLogs, createStrokeLog, deleteStrokeLog, getPracticeSessions, createPracticeSession, deletePracticeSession, type TennisStrokeLog, type TennisPracticeSession } from "@/lib/api";
import { toLocalISODate as today } from "@/lib/date";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

const CATEGORIES = ["Forehand", "Backhand", "Serve", "Return", "Volley", "Specialty"];

const TYPE_SUGGESTIONS: Record<string, string[]> = {
  Forehand: ["Topspin", "Flat", "Inside-out", "Inside-in", "Approach", "Passing", "Running"],
  Backhand: ["One-handed", "Two-handed", "Crosscourt", "Down-the-line", "Slice", "Passing", "Defense"],
  Serve: ["First serve flat", "First serve kick", "First serve slice", "Second serve kick", "Second serve slice"],
  Return: ["Forehand return", "Backhand return", "Chip return", "Aggressive return"],
  Volley: ["Forehand volley", "Backhand volley", "Half volley", "Drop volley", "Overhead"],
  Specialty: ["Drop shot", "Lob", "Tweener", "Passing shot", "Approach"],
};

export default function TennisStrokesPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<TennisStrokeLog[]>([]);
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("Forehand");
  const [type, setType] = useState("Topspin");
  const [attempts, setAttempts] = useState(50);
  const [makes, setMakes] = useState(35);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const [sessions, setSessions] = useState<TennisPracticeSession[]>([]);
  const [sessionDate, setSessionDate] = useState(today());
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionIntensity, setSessionIntensity] = useState(6);
  const [sessionCoach, setSessionCoach] = useState("");
  const [sessionPartner, setSessionPartner] = useState("");
  const [sessionFocus, setSessionFocus] = useState("");
  const [sessionPerformance, setSessionPerformance] = useState("");
  const [addingSession, setAddingSession] = useState(false);

  function load() {
    getStrokeLogs(30)
      .then(setLogs)
      .catch(() => setLogs([]));
    getPracticeSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }
  useEffect(load, []);

  async function onAddSession(e: React.FormEvent) {
    e.preventDefault();
    setAddingSession(true);
    try {
      await createPracticeSession({
        date: sessionDate,
        duration_min: sessionDuration,
        intensity: sessionIntensity,
        coach: sessionCoach || undefined,
        partner: sessionPartner || undefined,
        focus_area: sessionFocus || undefined,
        performance_notes: sessionPerformance || undefined,
      });
      showToast("Practice session logged.", "success");
      setSessionCoach("");
      setSessionPartner("");
      setSessionFocus("");
      setSessionPerformance("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setAddingSession(false);
    }
  }

  async function onDeleteSession(id: string) {
    await deletePracticeSession(id);
    load();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createStrokeLog({ date, stroke_category: category, stroke_type: type, attempts, makes, notes: notes || undefined });
      showToast(`Logged ${type}: ${makes}/${attempts}.`, "success");
      setNotes("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteStrokeLog(id);
      showToast("Deleted.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  // Aggregate consistency % by category over the loaded window
  const byCategory = CATEGORIES.map((cat) => {
    const rows = logs.filter((l) => l.stroke_category === cat);
    const attemptsSum = rows.reduce((s, r) => s + r.attempts, 0);
    const makesSum = rows.reduce((s, r) => s + r.makes, 0);
    const pct = attemptsSum ? Math.round((makesSum / attemptsSum) * 100) : null;
    return { cat, pct, count: rows.length };
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader
        title="Stroke Tracker"
        description="Forehand, backhand, serve, return, volley, and specialty shots — logged and tracked for consistency."
      />

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Practice sessions</h2>
        <form onSubmit={onAddSession} className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className={inputClass} />
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={sessionDuration}
              onChange={(e) => setSessionDuration(Number(e.target.value))}
              placeholder="Duration (min)"
              className={inputClass}
            />
            <input
              type="text"
              value={sessionCoach}
              onChange={(e) => setSessionCoach(e.target.value)}
              placeholder="Coach (optional)"
              className={inputClass}
            />
            <input
              type="text"
              value={sessionPartner}
              onChange={(e) => setSessionPartner(e.target.value)}
              placeholder="Partner (optional)"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={sessionFocus}
              onChange={(e) => setSessionFocus(e.target.value)}
              placeholder="Focus area (e.g. Serve + Volleys)"
              className={inputClass}
            />
            <div>
              <label className="text-xs text-fg-dim block mb-1">Intensity: {sessionIntensity}/10</label>
              <input
                type="range"
                min={1}
                max={10}
                value={sessionIntensity}
                onChange={(e) => setSessionIntensity(Number(e.target.value))}
                className="w-full accent-[#4ADE80]"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-fg-dim block mb-1">How did you perform?</label>
            <textarea
              value={sessionPerformance}
              onChange={(e) => setSessionPerformance(e.target.value)}
              placeholder="What went well, what you struggled with, how you felt…"
              className={inputClass}
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={addingSession}
            className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-1.5 rounded-md transition-colors"
          >
            {addingSession ? "Logging…" : "Log practice session"}
          </button>
        </form>
        {sessions.length > 0 && (
          <div className="space-y-1.5">
            {sessions.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="rounded-md border border-surface-border bg-surface-panel px-3 py-2 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-fg-muted">
                    {s.date} · {s.duration_min}min · intensity {s.intensity}/10
                    {s.focus_area ? ` · ${s.focus_area}` : ""}
                    {s.coach ? ` · with ${s.coach}` : ""}
                  </p>
                  {s.performance_notes && (
                    <p className="text-xs text-fg-dim italic mt-0.5">{s.performance_notes}</p>
                  )}
                </div>
                <button onClick={() => onDeleteSession(s.id)} className="text-xs text-fg-dim hover:text-warn px-2">
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {byCategory.map(({ cat, pct, count }) => (
          <div key={cat} className="rounded-lg border border-surface-border bg-surface-panel px-3 py-3 text-center">
            <p className="text-xs text-fg-dim">{cat}</p>
            <p className="font-display text-2xl text-accent tabular-nums mt-1">{pct !== null ? `${pct}%` : "—"}</p>
            <p className="text-xs text-fg-dim">{count} logs</p>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Log strokes</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-dim block mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-fg-dim block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setType(TYPE_SUGGESTIONS[e.target.value][0]);
              }}
              className={inputClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Stroke type</label>
          <input
            type="text"
            list="stroke-type-suggestions"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          />
          <datalist id="stroke-type-suggestions">
            {(TYPE_SUGGESTIONS[category] || []).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-dim block mb-1">Attempts</label>
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={attempts}
              onChange={(e) => setAttempts(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-fg-dim block mb-1">Makes / winners</label>
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={makes}
              onChange={(e) => setMakes(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={2} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Saving…" : "Log it"}
        </button>
      </form>

      <div className="space-y-2">
        {logs.length === 0 && <p className="text-sm text-fg-dim">No strokes logged yet.</p>}
        {logs.map((l) => (
          <div
            key={l.id}
            className="rounded-lg border border-surface-border bg-surface-panel p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm text-fg">
                <span className="text-accent">{l.stroke_category}</span> — {l.stroke_type}
              </p>
              <p className="text-xs text-fg-dim">
                {l.date} · {l.makes}/{l.attempts} ({Math.round((l.makes / l.attempts) * 100)}%)
              </p>
            </div>
            <button onClick={() => onDelete(l.id)} className="text-xs text-fg-dim hover:text-warn px-2 py-1">
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
