"use client";

import { useEffect, useState } from "react";
import { getAICoachSummaries, generateAICoachSummary, type AICoachSummary } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

function mostRecentSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function CoachPage() {
  const [summaries, setSummaries] = useState<AICoachSummary[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadSummaries() {
    if (!DEMO_USER_ID) return;
    getAICoachSummaries(DEMO_USER_ID)
      .then(setSummaries)
      .catch(() => setSummaries([]));
  }

  useEffect(loadSummaries, []);

  async function onGenerate() {
    setPending(true);
    setError(null);
    try {
      await generateAICoachSummary(DEMO_USER_ID, mostRecentSunday());
      loadSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
        <h1 className="font-display text-3xl tracking-tight text-fg">AI Coach</h1>
        <p className="text-sm text-fg-dim mt-2">
          Generates a short written report from this week&apos;s logged data — wins, weakness, next focus.
        </p>
      </header>

      <div>
        <button
          onClick={onGenerate}
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Generating…" : "Generate this week's report"}
        </button>
        {error && <p className="text-warn text-sm mt-2">{error}</p>}
      </div>

      <div className="space-y-4">
        {summaries.length === 0 && (
          <p className="text-sm text-fg-dim">No reports generated yet — click the button above.</p>
        )}
        {summaries.map((s) => (
          <div key={s.id} className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <p className="text-sm text-accent mb-2">Week of {s.week_start}</p>
            <p className="text-sm text-fg whitespace-pre-wrap">{s.summary_text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
