"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getGoals, createGoal, updateGoalStatus, type Goal } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const CATEGORIES = ["Physical", "Strength", "Basketball", "Lifestyle"];

const STATUS_LABEL: Record<Goal["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
  MISSED: "Missed",
};

export default function GoalsPage() {
  const { userId } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function loadGoals() {
    if (!userId) return;
    getGoals(userId)
      .then(setGoals)
      .catch(() => setGoals([]));
  }

  useEffect(loadGoals, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setPending(true);
    setStatus(null);
    try {
      await createGoal(userId, {
        title,
        category,
        target: target || undefined,
        deadline: deadline || undefined,
      });
      setTitle("");
      setTarget("");
      setDeadline("");
      setStatus({ type: "success", text: "Goal added." });
      loadGoals();
    } catch (err) {
      setStatus({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  async function cycleStatus(goal: Goal) {
    const order: Goal["status"][] = ["NOT_STARTED", "IN_PROGRESS", "ACHIEVED"];
    const next = order[(order.indexOf(goal.status) + 1) % order.length];
    await updateGoalStatus(goal.id, next);
    loadGoals();
  }

  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    items: goals.filter((g) => g.category.toLowerCase() === cat.toLowerCase()),
  }));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
<PageHeader title="Goals" />

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Add a goal</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bench 225 for 5"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Target (optional)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="225 lb x 5"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Deadline (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Adding…" : "Add goal"}
        </button>
        {status && (
          <p className={status.type === "success" ? "text-accent text-sm" : "text-warn text-sm"}>{status.text}</p>
        )}
      </form>

      <div className="space-y-6">
        {grouped.map(({ category: cat, items }) => (
          <div key={cat}>
            <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">{cat}</h2>
            {items.length === 0 ? (
              <p className="text-sm text-fg-dim">No goals yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => cycleStatus(g)}
                    className="w-full text-left rounded-lg border border-surface-border bg-surface-panel px-4 py-3 flex items-center justify-between hover:bg-surface-panelHover transition-colors"
                  >
                    <div>
                      <p className="text-sm text-fg">{g.title}</p>
                      {g.target && <p className="text-xs text-fg-dim">{g.target}</p>}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        g.status === "ACHIEVED" ? "text-accent" : "text-fg-dim"
                      }`}
                    >
                      {STATUS_LABEL[g.status]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
