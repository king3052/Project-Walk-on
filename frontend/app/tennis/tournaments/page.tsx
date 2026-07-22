"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import {
  getTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  type TennisTournament,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-fg-dim block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function TennisTournamentsPage() {
  const { showToast } = useToast();
  const [tournaments, setTournaments] = useState<TennisTournament[]>([]);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<Partial<TennisTournament>>({
    registration_status: "Planned",
    surface: "Hard",
  });

  function load() {
    getTournaments()
      .then(setTournaments)
      .catch(() => setTournaments([]));
  }
  useEffect(load, []);

  function setField<K extends keyof TennisTournament>(key: K, value: TennisTournament[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setPending(true);
    try {
      await createTournament(form);
      showToast("Tournament added.", "success");
      setForm({ registration_status: "Planned", surface: "Hard" });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  async function onUpdateStatus(t: TennisTournament, registration_status: string) {
    await updateTournament(t.id, { registration_status });
    load();
  }

  async function onDelete(id: string) {
    try {
      await deleteTournament(id);
      showToast("Removed.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader title="Tournament Center" description="Plan, register for, and track results across tournaments." />

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Add a tournament</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input
              type="text"
              value={form.name || ""}
              onChange={(e) => setField("name", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="Location">
            <input
              type="text"
              value={form.location || ""}
              onChange={(e) => setField("location", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Start date">
            <input
              type="date"
              value={form.start_date || ""}
              onChange={(e) => setField("start_date", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="End date">
            <input
              type="date"
              value={form.end_date || ""}
              onChange={(e) => setField("end_date", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Surface">
            <select value={form.surface || "Hard"} onChange={(e) => setField("surface", e.target.value)} className={inputClass}>
              <option>Hard</option>
              <option>Clay</option>
              <option>Grass</option>
              <option>Indoor</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.registration_status || "Planned"}
              onChange={(e) => setField("registration_status", e.target.value)}
              className={inputClass}
            >
              <option>Planned</option>
              <option>Registered</option>
              <option>Completed</option>
            </select>
          </Field>
          <Field label="Seed (optional)">
            <input
              type="text"
              value={form.seed || ""}
              onChange={(e) => setField("seed", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Ranking points (optional)">
            <input
              type="number"
              onFocus={(e) => e.target.select()}
              value={form.ranking_points ?? ""}
              onChange={(e) => setField("ranking_points", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Adding…" : "Add tournament"}
        </button>
      </form>

      <div className="space-y-2">
        {tournaments.length === 0 && <p className="text-sm text-fg-dim">No tournaments yet.</p>}
        {tournaments.map((t) => (
          <div key={t.id} className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-fg">{t.name}</p>
                <p className="text-xs text-fg-dim">
                  {t.start_date || "no date"} {t.location ? `· ${t.location}` : ""} {t.surface ? `· ${t.surface}` : ""}
                  {t.result ? ` · ${t.result}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={t.registration_status || "Planned"}
                  onChange={(e) => onUpdateStatus(t, e.target.value)}
                  className="text-xs bg-surface-panelHover border border-surface-border rounded-md px-2 py-1 text-fg-dim"
                >
                  <option>Planned</option>
                  <option>Registered</option>
                  <option>Completed</option>
                </select>
                <button onClick={() => onDelete(t.id)} className="text-xs text-fg-dim hover:text-warn px-2 py-1">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
