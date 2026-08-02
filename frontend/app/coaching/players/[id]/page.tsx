"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { PointLogView } from "@/components/TennisScoreBoard";
import {
  getPlayerDashboard,
  listComments,
  addComment,
  createAssignment,
  listAssignmentsForPlayer,
  createMatchReview,
  listMatchReviews,
  createPracticePlan,
  listPracticePlansForPlayer,
  deletePracticePlan,
  proposeGoal,
  getMatchPointsForCoach,
  getMatchScoutingForCoach,
  type PlayerDashboard,
  type CoachComment,
  type CoachAssignment,
  type CoachMatchReview,
  type TennisMatchState,
  type TennisMatchScouting,
  type PracticePlan,
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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-6 h-6 rounded text-xs transition-colors ${
            n <= value ? "bg-accent text-accent-deep" : "bg-surface-panelHover text-fg-dim"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function MatchReviewForm({ playerId, matchId }: { playerId: string; matchId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<CoachMatchReview[]>([]);
  const [serve, setServe] = useState(3);
  const [footwork, setFootwork] = useState(3);
  const [mental, setMental] = useState(3);
  const [shotSelection, setShotSelection] = useState(3);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    listMatchReviews(playerId, matchId)
      .then(setReviews)
      .catch(() => setReviews([]));
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createMatchReview(playerId, matchId, {
        serve_rating: serve,
        footwork_rating: footwork,
        mental_rating: mental,
        shot_selection_rating: shotSelection,
        notes: notes || undefined,
      });
      setNotes("");
      showToast("Review posted.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2">
      <button onClick={() => setOpen((v) => !v)} className="text-xs text-accent hover:underline">
        {open ? "Hide review" : "Review this match"}
      </button>
      {open && (
        <div className="mt-2 space-y-3 pl-3 border-l border-surface-border">
          {reviews.map((r) => (
            <div key={r.id} className="text-xs text-fg-dim">
              Serve {r.serve_rating}/5 · Footwork {r.footwork_rating}/5 · Mental {r.mental_rating}/5 · Shot selection{" "}
              {r.shot_selection_rating}/5
              {r.notes && <p className="italic mt-0.5">{r.notes}</p>}
            </div>
          ))}
          <form onSubmit={onSubmit} className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-fg-dim mb-1">Serve</p>
                <StarRating value={serve} onChange={setServe} />
              </div>
              <div>
                <p className="text-fg-dim mb-1">Footwork</p>
                <StarRating value={footwork} onChange={setFootwork} />
              </div>
              <div>
                <p className="text-fg-dim mb-1">Mental</p>
                <StarRating value={mental} onChange={setMental} />
              </div>
              <div>
                <p className="text-fg-dim mb-1">Shot selection</p>
                <StarRating value={shotSelection} onChange={setShotSelection} />
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for the player…"
              className={`${inputClass} text-xs`}
              rows={2}
            />
            <button
              type="submit"
              disabled={pending}
              className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors"
            >
              {pending ? "Posting…" : "Post review"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MatchDetailPanel({ playerId, matchId }: { playerId: string; matchId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<TennisMatchState | null>(null);
  const [scouting, setScouting] = useState<TennisMatchScouting[]>([]);

  async function onOpen() {
    const next = !open;
    setOpen(next);
    if (next && !state) {
      setLoading(true);
      try {
        const [pointState, scoutingReports] = await Promise.all([
          getMatchPointsForCoach(playerId, matchId),
          getMatchScoutingForCoach(playerId, matchId),
        ]);
        setState(pointState);
        setScouting(scoutingReports);
      } catch {
        // leave state null — the panel will show nothing rather than crash
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="mt-2">
      <button onClick={onOpen} className="text-xs text-accent hover:underline">
        {open ? "Hide full match detail" : "See every point + AI scouting"}
      </button>
      {open && (
        <div className="mt-3 space-y-4">
          {loading && <p className="text-xs text-fg-dim">Loading…</p>}

          {!loading && scouting.length > 0 && (
            <div className="rounded-md bg-surface-panelHover p-3 space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-fg-dim">AI scouting</p>
              {scouting.map((report) => (
                <div key={report.id} className="space-y-1">
                  {report.strengths && (
                    <p className="text-xs text-fg">
                      <span className="text-accent">Strengths:</span> {report.strengths}
                    </p>
                  )}
                  {report.weaknesses && (
                    <p className="text-xs text-fg">
                      <span className="text-warn">Weaknesses:</span> {report.weaknesses}
                    </p>
                  )}
                  {report.patterns && (
                    <p className="text-xs text-fg">
                      <span className="text-fg-muted">Patterns:</span> {report.patterns}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!loading && state && (
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">Every point</p>
              <PointLogView state={state} />
            </div>
          )}

          {!loading && !state && scouting.length === 0 && (
            <p className="text-xs text-fg-dim">No point-by-point data or AI scouting for this match yet.</p>
          )}
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

  const [plans, setPlans] = useState<PracticePlan[]>([]);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  });
  const [planItems, setPlanItems] = useState<{ day_of_week: number; activity: string; duration_min?: number }[]>([]);
  const [itemDay, setItemDay] = useState(1);
  const [itemActivity, setItemActivity] = useState("");
  const [itemDuration, setItemDuration] = useState(60);
  const [savingPlan, setSavingPlan] = useState(false);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalCategory, setGoalCategory] = useState("Strength");
  const [goalTarget, setGoalTarget] = useState("");
  const [proposingGoal, setProposingGoal] = useState(false);

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function loadPlans() {
    listPracticePlansForPlayer(playerId)
      .then(setPlans)
      .catch(() => setPlans([]));
  }

  function addPlanItem() {
    if (!itemActivity.trim()) return;
    setPlanItems((prev) => [...prev, { day_of_week: itemDay, activity: itemActivity, duration_min: itemDuration }]);
    setItemActivity("");
  }

  function removePlanItem(index: number) {
    setPlanItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSavePlan() {
    if (planItems.length === 0) return;
    setSavingPlan(true);
    try {
      await createPracticePlan(playerId, weekStart, planItems);
      showToast("Practice plan created.", "success");
      setPlanItems([]);
      loadPlans();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setSavingPlan(false);
    }
  }

  async function onDeletePlan(planId: string) {
    if (!window.confirm("Delete this practice plan? This can't be undone.")) return;
    await deletePracticePlan(planId);
    loadPlans();
  }

  async function onProposeGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    setProposingGoal(true);
    try {
      await proposeGoal(playerId, { title: goalTitle, category: goalCategory, target: goalTarget || undefined });
      showToast("Goal proposed.", "success");
      setGoalTitle("");
      setGoalTarget("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setProposingGoal(false);
    }
  }

  function load() {
    getPlayerDashboard(playerId)
      .then(setDashboard)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this player."));
    listAssignmentsForPlayer(playerId)
      .then(setAssignments)
      .catch(() => setAssignments([]));
    loadPlans();
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

      {dashboard.player_sport === "Tennis" ? (
        <>
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
                <MatchReviewForm playerId={playerId} matchId={m.id} />
                <MatchDetailPanel playerId={playerId} matchId={m.id} />
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
                {p.performance_notes && <p className="text-xs text-fg-dim italic mt-0.5">{p.performance_notes}</p>}
                <CommentThread playerId={playerId} targetType="practice_session" targetId={p.id} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recent training sessions</h2>
            {dashboard.training_sessions.length === 0 && <p className="text-sm text-fg-dim">None logged yet.</p>}
            {dashboard.training_sessions.map((t) => (
              <div key={t.id} className="border-b border-surface-border last:border-0 pb-2 last:pb-0">
                <p className="text-sm text-fg">
                  {t.date} · {t.type} {t.duration_min ? `· ${t.duration_min}min` : ""} {t.rpe ? `· RPE ${t.rpe}` : ""}
                </p>
                <CommentThread playerId={playerId} targetType="training_session" targetId={t.id} />
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recent shooting sessions</h2>
            {dashboard.shooting_sessions.length === 0 && <p className="text-sm text-fg-dim">None logged yet.</p>}
            {dashboard.shooting_sessions.map((s) => (
              <div key={s.id} className="border-b border-surface-border last:border-0 pb-2 last:pb-0">
                <p className="text-sm text-fg">
                  {s.date} · {s.shot_type} — {s.makes}/{s.attempts} ({Math.round((s.makes / s.attempts) * 100)}%)
                </p>
                <CommentThread playerId={playerId} targetType="shooting_log" targetId={s.id} />
              </div>
            ))}
          </div>
        </>
      )}

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

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Build a practice plan</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-fg-dim">Week of</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <select value={itemDay} onChange={(e) => setItemDay(Number(e.target.value))} className={inputClass}>
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={itemActivity}
            onChange={(e) => setItemActivity(e.target.value)}
            placeholder="Activity"
            className={`${inputClass} col-span-2`}
          />
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={itemDuration}
            onChange={(e) => setItemDuration(Number(e.target.value))}
            placeholder="min"
            className={inputClass}
          />
        </div>
        <button
          onClick={addPlanItem}
          className="text-xs text-accent hover:underline"
        >
          + Add to plan
        </button>

        {planItems.length > 0 && (
          <div className="space-y-1">
            {planItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-fg-dim">
                <span>
                  {DAY_NAMES[item.day_of_week]}: {item.activity} ({item.duration_min}min)
                </span>
                <button onClick={() => removePlanItem(i)} className="hover:text-warn px-2">
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={onSavePlan}
              disabled={savingPlan}
              className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-1.5 rounded-md transition-colors"
            >
              {savingPlan ? "Saving…" : "Save plan"}
            </button>
          </div>
        )}

        {plans.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-border">
            {plans.map((p) => (
              <div key={p.id} className="text-xs text-fg-dim">
                <div className="flex items-center justify-between">
                  <span className="text-fg">Week of {p.week_start_date}</span>
                  <button onClick={() => onDeletePlan(p.id)} className="hover:text-warn px-2">
                    Delete
                  </button>
                </div>
                {p.items.map((item) => (
                  <p key={item.id}>
                    {DAY_NAMES[item.day_of_week]}: {item.activity} ({item.duration_min}min)
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Propose a goal</h2>
        <form onSubmit={onProposeGoal} className="space-y-2">
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="Goal title"
            className={inputClass}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={goalCategory} onChange={(e) => setGoalCategory(e.target.value)} className={inputClass}>
              <option>Physical</option>
              <option>Strength</option>
              <option>Tennis</option>
              <option>Lifestyle</option>
            </select>
            <input
              type="text"
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="Target (optional)"
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={proposingGoal}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
          >
            {proposingGoal ? "Proposing…" : "Propose goal"}
          </button>
        </form>
      </div>
    </main>
  );
}
