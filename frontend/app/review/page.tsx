"use client";

import { useEffect, useState } from "react";
import { logWeeklyReview, getWeeklyReviews, type WeeklyReview } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

function mostRecentSunday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

export default function ReviewPage() {
  const [weekStart, setWeekStart] = useState(mostRecentSunday());
  const [wins, setWins] = useState("");
  const [weakness, setWeakness] = useState("");
  const [nextFocus, setNextFocus] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<WeeklyReview[]>([]);

  function loadHistory() {
    if (!DEMO_USER_ID) return;
    getWeeklyReviews(DEMO_USER_ID)
      .then(setHistory)
      .catch(() => setHistory([]));
  }

  useEffect(loadHistory, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus(null);
    try {
      await logWeeklyReview(DEMO_USER_ID, weekStart, {
        wins,
        weakness,
        next_focus: nextFocus,
      });
      setStatus({ type: "success", text: "Review saved." });
      setWins("");
      setWeakness("");
      setNextFocus("");
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
        <h1 className="font-display text-3xl tracking-tight text-fg">Weekly review</h1>
      </header>

      <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Week of</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Wins</label>
          <textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            placeholder="+3 lbs, +10 lb squat, +4% shooting…"
            className={inputClass}
            rows={3}
          />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Weakness</label>
          <textarea
            value={weakness}
            onChange={(e) => setWeakness(e.target.value)}
            placeholder="Left-hand finishing…"
            className={inputClass}
            rows={2}
          />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Next focus</label>
          <textarea
            value={nextFocus}
            onChange={(e) => setNextFocus(e.target.value)}
            placeholder="Attack left side…"
            className={inputClass}
            rows={2}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Saving…" : "Save review"}
        </button>
        {status && (
          <p className={status.type === "success" ? "text-accent text-sm" : "text-warn text-sm"}>
            {status.text}
          </p>
        )}
      </form>

      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Past reviews</h2>
        {history.length === 0 && <p className="text-sm text-fg-dim">No reviews logged yet.</p>}
        {history.map((r) => (
          <div key={r.id} className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-2">
            <p className="text-sm text-accent">Week of {r.week_start}</p>
            {r.wins && <p className="text-sm text-fg"><span className="text-fg-dim">Wins:</span> {r.wins}</p>}
            {r.weakness && (
              <p className="text-sm text-fg"><span className="text-fg-dim">Weakness:</span> {r.weakness}</p>
            )}
            {r.next_focus && (
              <p className="text-sm text-fg"><span className="text-fg-dim">Next focus:</span> {r.next_focus}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
