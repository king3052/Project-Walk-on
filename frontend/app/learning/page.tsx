"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ToastProvider";
import {
  getLearningResources,
  getRecommendedLearning,
  getPersonalizedFeed,
  refreshPersonalizedFeed,
  type LearningResource,
  type LearningRecommendation,
  type LearningFeedItem,
} from "@/lib/api";

export default function LearningPage() {
  const { showToast } = useToast();
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [rec, setRec] = useState<LearningRecommendation | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [feedItems, setFeedItems] = useState<LearningFeedItem[]>([]);
  const [feedConfigured, setFeedConfigured] = useState(true);
  const [feedNote, setFeedNote] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [refreshingFeed, setRefreshingFeed] = useState(false);

  useEffect(() => {
    getLearningResources()
      .then(setResources)
      .catch(() => setResources([]));

    getPersonalizedFeed()
      .then((result) => {
        setFeedItems(result.items);
        setFeedConfigured(result.configured);
        setFeedNote(result.note || null);
      })
      .catch(() => setFeedConfigured(false))
      .finally(() => setFeedLoading(false));
  }, []);

  async function onRefreshFeed() {
    setRefreshingFeed(true);
    try {
      const result = await refreshPersonalizedFeed();
      setFeedItems(result.items);
      setFeedConfigured(result.configured);
      setFeedNote(result.note || null);
      if (result.items.length === 0 && !result.note) {
        showToast("Log a scouting report or some goals first for personalized picks.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't refresh right now.", "error");
    } finally {
      setRefreshingFeed(false);
    }
  }

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

      <div className="rounded-lg border border-accent/40 bg-surface-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">For you</h2>
            <p className="text-xs text-fg-dim mt-0.5">
              Real videos, live-searched based on your current weak points — refreshes automatically every 2 days.
            </p>
          </div>
          <button
            onClick={onRefreshFeed}
            disabled={refreshingFeed || !feedConfigured}
            className="text-xs text-accent hover:text-accent-dim disabled:opacity-50 transition-colors shrink-0"
          >
            {refreshingFeed ? "Searching…" : "Refresh now"}
          </button>
        </div>

        {feedLoading ? (
          <p className="text-sm text-fg-dim">Loading…</p>
        ) : !feedConfigured ? (
          <p className="text-sm text-fg-dim">{feedNote || "YouTube search isn't configured yet."}</p>
        ) : feedItems.length === 0 ? (
          <p className="text-sm text-fg-dim">
            {feedNote || "Log a scouting report, a goal, or an injury for personalized video picks."}
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {feedItems.map((item) => (
              <a
                key={item.id}
                href={item.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-surface-border bg-surface-panelHover overflow-hidden hover:border-accent/50 transition-colors"
              >
                {item.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail_url} alt="" className="w-full aspect-video object-cover" />
                )}
                <div className="p-3">
                  <p className="text-sm text-fg leading-snug">{item.title}</p>
                  {item.channel_title && <p className="text-xs text-fg-dim mt-1">{item.channel_title}</p>}
                  {item.reason && <p className="text-xs text-accent mt-1">{item.reason}</p>}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recommended topics</h2>
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
