"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getGoals, createGoal, updateGoalStatus, getMe, listComments, addComment, type Goal, type CoachComment } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

function categoriesFor(sport: string) {
  return ["Physical", "Strength", sport, "Lifestyle"];
}

const STATUS_LABEL: Record<Goal["status"], string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
  MISSED: "Missed",
};

function GoalCommentThread({ goalId }: { goalId: string }) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    if (!userId) return;
    listComments(userId, "goal", goalId)
      .then(setComments)
      .catch(() => setComments([]));
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !userId) return;
    setPending(true);
    try {
      await addComment(userId, "goal", goalId, text);
      setText("");
      load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-1">
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-accent hover:underline">
        {open ? "Hide comments" : `Comments${comments.length ? ` (${comments.length})` : ""}`}
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-3 border-l border-surface-border">
          {comments.map((c) => (
            <p key={c.id} className="text-xs text-fg">
              <span className="text-accent">{c.author_name || "Someone"}:</span> {c.comment}
            </p>
          ))}
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Leave a comment…"
              className="flex-1 bg-surface-panelHover border border-surface-border rounded-md px-2 py-1 text-xs text-fg focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={pending}
              className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1 rounded-md transition-colors shrink-0"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const { userId } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sport, setSport] = useState("Basketball");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Physical");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getMe()
      .then((u) => setSport(u.sport || "Basketball"))
      .catch(() => {});
  }, []);

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
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: next } : g)));
    try {
      await updateGoalStatus(goal.id, next);
    } catch {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status: goal.status } : g))); // revert
    }
  }

  const grouped = categoriesFor(sport).map((cat) => ({
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
              {categoriesFor(sport).map((c) => (
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
                  <div key={g.id} className="rounded-lg border border-surface-border bg-surface-panel px-4 py-3">
                    <button
                      onClick={() => cycleStatus(g)}
                      className="w-full text-left flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <p className="text-sm text-fg">
                          {g.title}
                          {g.proposed_by_coach_id && (
                            <span className="ml-2 text-xs text-accent">suggested by coach</span>
                          )}
                        </p>
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
                    <GoalCommentThread goalId={g.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
