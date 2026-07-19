"use client";

import { useEffect, useState } from "react";
import { logJournalEntry, getJournalEntries, type JournalEntry } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

const today = () => new Date().toISOString().slice(0, 10);

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

export default function JournalPage() {
  const [date, setDate] = useState(today());
  const [wentWell, setWentWell] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [confidence, setConfidence] = useState(7);
  const [focus, setFocus] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<JournalEntry[]>([]);

  function loadHistory() {
    if (!DEMO_USER_ID) return;
    getJournalEntries(DEMO_USER_ID)
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  useEffect(loadHistory, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      await logJournalEntry(DEMO_USER_ID, date, {
        went_well: wentWell,
        mistakes,
        confidence,
        focus,
      });
      setStatus({ type: "success", text: "Entry saved." });
      setWentWell("");
      setMistakes("");
      setFocus("");
      loadHistory();
    } catch (err) {
      setStatus({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  if (!DEMO_USER_ID) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-fg-muted">
          Set <code className="text-accent">NEXT_PUBLIC_DEMO_USER_ID</code> in{" "}
          <code className="text-accent">frontend/.env.local</code> first.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <NavBar />
      <header className="border-b border-surface-border pb-6">
        <p className="text-xs tracking-wide text-accent mb-1">Project Walk-On</p>
        <h1 className="font-display text-3xl tracking-tight text-fg">Journal</h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">What went well</label>
          <textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} className={inputClass} rows={2} />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Mistakes</label>
          <textarea value={mistakes} onChange={(e) => setMistakes(e.target.value)} className={inputClass} rows={2} />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Confidence (1-10): {confidence}</label>
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
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Focus for tomorrow</label>
          <textarea value={focus} onChange={(e) => setFocus(e.target.value)} className={inputClass} rows={2} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
        {status && (
          <p className={status.type === "success" ? "text-accent text-sm" : "text-warn text-sm"}>{status.text}</p>
        )}
      </form>

      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Past entries</h2>
        {history.length === 0 && <p className="text-sm text-fg-dim">No entries logged yet.</p>}
        {history.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-accent">{entry.date}</p>
              {entry.confidence !== null && (
                <p className="text-xs text-fg-dim">Confidence: {entry.confidence}/10</p>
              )}
            </div>
            {entry.went_well && <p className="text-sm text-fg"><span className="text-fg-dim">Went well:</span> {entry.went_well}</p>}
            {entry.mistakes && <p className="text-sm text-fg"><span className="text-fg-dim">Mistakes:</span> {entry.mistakes}</p>}
            {entry.focus && <p className="text-sm text-fg"><span className="text-fg-dim">Focus:</span> {entry.focus}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
