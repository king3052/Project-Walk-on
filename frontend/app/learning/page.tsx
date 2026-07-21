"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  getLearningResources,
  getRecommendedLearning,
  type LearningResource,
  type LearningRecommendation,
} from "@/lib/api";

export default function LearningPage() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [rec, setRec] = useState<LearningRecommendation | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLearningResources()
      .then(setResources)
      .catch(() => setResources([]));
  }, []);

  async function onRecommend() {
    setPending(true);
    setError(null);
    try {
      const result = await getRecommendedLearning();
      setRec(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get recommendations.");
    } finally {
      setPending(false);
    }
  }

  const grouped = resources.reduce<Record<string, LearningResource[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader
        title="Learning Center"
        description="Curated resources on shooting, strength, nutrition, recovery, and the mental game."
      />

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recommended for you</h2>
          <button
            onClick={onRecommend}
            disabled={pending}
            className="text-xs text-accent hover:text-accent-dim disabled:opacity-50 transition-colors"
          >
            {pending ? "Thinking…" : rec ? "Refresh" : "Get picks"}
          </button>
        </div>
        {error && <p className="text-warn text-sm">{error}</p>}
        {rec && rec.picks.length === 0 && (
          <p className="text-sm text-fg-dim">
            {rec.note || "Nothing to recommend yet — log a scouting report or some goals first."}
          </p>
        )}
        {rec && rec.picks.length > 0 && (
          <ul className="space-y-2">
            {rec.picks.map((p, i) => (
              <li key={i}>
                <p className="text-sm text-accent">{p.category}</p>
                <p className="text-xs text-fg-dim">{p.reason}</p>
              </li>
            ))}
          </ul>
        )}
        {!rec && !error && (
          <p className="text-sm text-fg-dim">
            Click &quot;Get picks&quot; for topics chosen from your actual scouting report, goals, and injuries.
          </p>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">{category}</h2>
            <div className="space-y-2">
              {items.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-surface-border bg-surface-panel p-4 hover:bg-surface-panelHover transition-colors"
                >
                  <p className="text-sm text-fg">{r.title}</p>
                  <p className="text-xs text-fg-dim mt-1">{r.description}</p>
                  <p className="text-xs text-accent mt-1">{r.source}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
