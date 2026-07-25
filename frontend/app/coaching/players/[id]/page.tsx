"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import {
  getPlayerDashboard,
  listComments,
  addComment,
  createAssignment,
  listAssignmentsForPlayer,
  type PlayerDashboard,
  type CoachComment,
  type CoachAssignment,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

function CommentThread({
  playerId,
  targetType,
  targetId,
}: {
  playerId: string;
  targetType: string;
  targetId: string;
}) {
  const { showToast } = useToast();
  const [comments, setComments] = useState<CoachComment[]>([]);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function load() {
    listComments(playerId, targetType, targetId)
      .then(setComments)
      .catch(() => setComments([]));
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPending(true);
    try {
      await addComment(playerId, targetType, targetId, text);
      setText("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't post comment.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-accent hover:underline">
        {open ? "Hide comments" : `Comments (${comments.length || "…"})`}
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
              className={`${inputClass} text-xs py-1`}
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

export default function CoachPlayerDetailPage() {
  const params = useParams();
  const playerId = params.id as string;
  const { showToast } = useToast();

  const [dashboard, setDashboard] = useState<PlayerDashboard | null>(null);
  const [assignments, setAssignments] = useState<CoachAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [assigning, setAssigning] = useState(false);

  function load() {
    getPlayerDashboard(playerId)
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this player."));
    listAssignmentsForPlayer(playerId)
      .then(setAssignments)
      .catch(() => setAssignments([]));
  }
  useEffect(load, [playerId]);

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setAssigning(true);
    try {
      await createAssignment(playerId, {
        title,
        description: description || undefined,
        video_url: videoUrl || undefined,
      });
      showToast("Assigned.", "success");
      setTitle("");
      setDescription("");
      setVideoUrl("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setAssigning(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-warn text-sm">{error}</p>
      </main>
    );
  }
  if (!dashboard) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-fg-dim">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader title={dashboard.player_name} description={dashboard.player_sport || undefined} />

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recent matches</h2>
        {dashboard.matches.length === 0 && <p className="text-sm text-fg-dim">No matches logged yet.</p>}
        {dashboard.matches.map((m) => (
          <div key={m.id} className="border-b border-surface-border last:border-0 pb-2 last:pb-0">
            <p className="text-sm">
              <span className={m.result === "Win" ? "text-accent" : "text-warn"}>{m.result || "—"}</span>{" "}
              <span className="text-fg">vs {m.opponent || "unknown"}</span>{" "}
              <span className="text-fg-dim">— {m.date} {m.score ? `(${m.score})` : ""}</span>
            </p>
            <CommentThread playerId={playerId} targetType="match" targetId={m.id} />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recent practice sessions</h2>
        {dashboard.practice_sessions.length === 0 && <p className="text-sm text-fg-dim">None logged yet.</p>}
        {dashboard.practice_sessions.map((p) => (
          <div key={p.id} className="border-b border-surface-border last:border-0 pb-2 last:pb-0">
            <p className="text-sm text-fg">
              {p.date} · {p.duration_min}min {p.focus_area ? `· ${p.focus_area}` : ""}
            </p>
            <CommentThread playerId={playerId} targetType="practice_session" targetId={p.id} />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-2">Goals</h2>
        {dashboard.goals.length === 0 ? (
          <p className="text-sm text-fg-dim">No goals set yet.</p>
        ) : (
          <ul className="space-y-1">
            {dashboard.goals.map((g) => (
              <li key={g.id} className="text-sm text-fg">
                {g.title} <span className="text-fg-dim">({g.status})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {dashboard.journal_shared && dashboard.journal && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-2">Journal (shared)</h2>
          {dashboard.journal.map((j, i) => (
            <p key={i} className="text-xs text-fg-dim mb-1">
              {j.date}: {j.went_well}
            </p>
          ))}
        </div>
      )}

      {dashboard.mental_shared && dashboard.mental_logs && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-2">Mental performance (shared)</h2>
          {dashboard.mental_logs.map((m, i) => (
            <p key={i} className="text-xs text-fg-dim mb-1">
              {m.date}: confidence {m.confidence}/10, focus {m.focus}/10
            </p>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Assign a drill or video</h2>
        <form onSubmit={onAssign} className="space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className={inputClass}
            required
          />
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Video link (optional)"
            className={inputClass}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instructions (optional)"
            className={inputClass}
            rows={2}
          />
          <button
            type="submit"
            disabled={assigning}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
          >
            {assigning ? "Assigning…" : "Assign"}
          </button>
        </form>

        {assignments.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-surface-border">
            {assignments.map((a) => (
              <p key={a.id} className="text-xs text-fg-dim">
                <span className={a.status === "Completed" ? "text-accent" : "text-fg"}>{a.status}</span> — {a.title}
                {a.player_note ? ` (player note: ${a.player_note})` : ""}
              </p>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
