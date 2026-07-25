"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import { getMentalLogs, createMentalLog, deleteMentalLog, type TennisMentalLog } from "@/lib/api";

const today = () => new Date().toISOString().slice(0, 10);
const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

export default function TennisMentalPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<TennisMentalLog[]>([]);
  const [date, setDate] = useState(today());
  const [confidence, setConfidence] = useState(7);
  const [focus, setFocus] = useState(7);
  const [pressureHandling, setPressureHandling] = useState(7);
  const [visualizationMinutes, setVisualizationMinutes] = useState(10);
  const [preMatchRoutine, setPreMatchRoutine] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    getMentalLogs()
      .then(setLogs)
      .catch(() => setLogs([]));
  }
  useEffect(load, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createMentalLog({
        date,
        confidence,
        focus,
        pressure_handling: pressureHandling,
        visualization_minutes: visualizationMinutes,
        pre_match_routine: preMatchRoutine || undefined,
        notes: notes || undefined,
      });
      showToast("Logged.", "success");
      setNotes("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    await deleteMentalLog(id);
    load();
  }

  const avg = (key: keyof TennisMentalLog) => {
    const vals = logs.map((l) => l[key]).filter((v) => typeof v === "number") as number[];
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader
        title="Mental Performance"
        description="Confidence, focus, and pressure handling — the mental side of your game, tracked over time."
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-surface-border bg-surface-panel px-4 py-3 text-center">
          <p className="text-xs text-fg-dim">Avg confidence</p>
          <p className="font-display text-2xl text-accent tabular-nums mt-1">{avg("confidence") ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-panel px-4 py-3 text-center">
          <p className="text-xs text-fg-dim">Avg focus</p>
          <p className="font-display text-2xl text-accent tabular-nums mt-1">{avg("focus") ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-surface-border bg-surface-panel px-4 py-3 text-center">
          <p className="text-xs text-fg-dim">Avg pressure handling</p>
          <p className="font-display text-2xl text-accent tabular-nums mt-1">{avg("pressure_handling") ?? "—"}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Log today</h2>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Confidence: {confidence}/10</label>
          <input
            type="range"
            min={1}
            max={10}
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
            className="w-full accent-[#4ADE80]"
          />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Focus: {focus}/10</label>
          <input
            type="range"
            min={1}
            max={10}
            value={focus}
            onChange={(e) => setFocus(Number(e.target.value))}
            className="w-full accent-[#4ADE80]"
          />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Pressure handling: {pressureHandling}/10</label>
          <input
            type="range"
            min={1}
            max={10}
            value={pressureHandling}
            onChange={(e) => setPressureHandling(Number(e.target.value))}
            className="w-full accent-[#4ADE80]"
          />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Visualization (minutes)</label>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={visualizationMinutes}
            onChange={(e) => setVisualizationMinutes(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-1">Pre-match routine (optional)</label>
          <input
            type="text"
            value={preMatchRoutine}
            onChange={(e) => setPreMatchRoutine(e.target.value)}
            placeholder="Breathing, stretch, visualize first 3 points…"
            className={inputClass}
          />
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
        {logs.length === 0 && <p className="text-sm text-fg-dim">Nothing logged yet.</p>}
        {logs.map((l) => (
          <div key={l.id} className="rounded-lg border border-surface-border bg-surface-panel p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-fg">
                Confidence {l.confidence}/10 · Focus {l.focus}/10 · Pressure {l.pressure_handling}/10
              </p>
              <p className="text-xs text-fg-dim">{l.date}</p>
              {l.notes && <p className="text-xs text-fg-dim italic mt-1">{l.notes}</p>}
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
