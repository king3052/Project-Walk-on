"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getAICoachSummaries, generateAICoachSummary, type AICoachSummary } from "@/lib/api";

function mostRecentSunday(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export default function CoachPage() {
  const { userId } = useAuth();
  const [summaries, setSummaries] = useState<AICoachSummary[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadSummaries() {
    if (!userId) return;
    getAICoachSummaries(userId)
      .then(setSummaries)
      .catch(() => setSummaries([]));
  }

  useEffect(loadSummaries, []);

  async function onGenerate() {
    if (!userId) return;
    setPending(true);
    setError(null);
    try {
      await generateAICoachSummary(userId, mostRecentSunday());
      loadSummaries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader
        title="AI Coach"
        description="Generates a short written report from this week's logged data — wins, weakness, next focus."
      />

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
