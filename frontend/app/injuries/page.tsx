"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { getInjuries, createInjury, updateInjury, type Injury } from "@/lib/api";
import { toLocalISODate as today } from "@/lib/date";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const STATUS_OPTIONS: Injury["status"][] = ["ACTIVE", "RECOVERING", "RESOLVED"];

function statusColor(status: Injury["status"]): string {
  if (status === "ACTIVE") return "text-warn";
  if (status === "RECOVERING") return "text-fg";
  return "text-accent";
}

export default function InjuriesPage() {
  const { userId } = useAuth();
  const [injuries, setInjuries] = useState<Injury[]>([]);

  const [dateReported, setDateReported] = useState(today());
  const [bodyPart, setBodyPart] = useState("");
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadInjuries() {
    if (!userId) return;
    getInjuries(userId)
      .then(setInjuries)
      .catch(() => setInjuries([]));
  }

  useEffect(loadInjuries, [userId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setPending(true);
    setError(null);
    try {
      await createInjury(userId, dateReported, bodyPart, severity, description || undefined);
      setBodyPart("");
      setDescription("");
      loadInjuries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  async function onUpdateStatus(id: string, status: Injury["status"]) {
    await updateInjury(id, { status });
    loadInjuries();
  }

  async function onUpdateRehab(id: string, rehab_notes: string) {
    await updateInjury(id, { rehab_notes });
    loadInjuries();
  }

  async function onUpdateReturnDate(id: string, return_to_play_date: string) {
    await updateInjury(id, { return_to_play_date });
    loadInjuries();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader title="Injury management" description="Track pain, rehab progress, and return-to-play timelines." />

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Log an injury</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Date</label>
            <input
              type="date"
              value={dateReported}
              onChange={(e) => setDateReported(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Body part</label>
            <input
              type="text"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="Right ankle, left knee…"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Severity (1-10): {severity}</label>
            <input
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-[#4ADE80]"
            />
          </div>
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">What happened (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={2}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Saving…" : "Log injury"}
        </button>
        {error && <p className="text-warn text-sm">{error}</p>}
      </form>

      <div className="space-y-3">
        {injuries.length === 0 && <p className="text-sm text-fg-dim">No injuries logged.</p>}
        {injuries.map((injury) => (
          <div key={injury.id} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-fg">{injury.body_part}</p>
                <p className="text-xs text-fg-dim">
                  Reported {injury.date_reported} · Severity {injury.severity}/10
                </p>
                {injury.description && <p className="text-xs text-fg-muted mt-1">{injury.description}</p>}
              </div>
              <select
                value={injury.status}
                onChange={(e) => onUpdateStatus(injury.id, e.target.value as Injury["status"])}
                className={`text-xs bg-surface-panelHover border border-surface-border rounded-md px-2 py-1 ${statusColor(
                  injury.status
                )}`}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-fg-dim block mb-1">Rehab notes</label>
                <textarea
                  defaultValue={injury.rehab_notes || ""}
                  onBlur={(e) => onUpdateRehab(injury.id, e.target.value)}
                  className={inputClass}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs text-fg-dim block mb-1">Return-to-play date</label>
                <input
                  type="date"
                  defaultValue={injury.return_to_play_date || ""}
                  onBlur={(e) => onUpdateReturnDate(injury.id, e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
