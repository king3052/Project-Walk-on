"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import {
  getTennisMatches,
  createTennisMatch,
  deleteTennisMatch,
  generateMatchScouting,
  getMatchScouting,
  type TennisMatch,
  type TennisMatchScouting,
} from "@/lib/api";

const today = () => new Date().toISOString().slice(0, 10);
const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-fg-dim block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function TennisMatchesPage() {
  const { showToast } = useToast();
  const [matches, setMatches] = useState<TennisMatch[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scoutingByMatch, setScoutingByMatch] = useState<Record<string, TennisMatchScouting[]>>({});
  const [scoutingLoading, setScoutingLoading] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [form, setForm] = useState<Partial<TennisMatch>>({
    date: today(),
    result: "Win",
    surface: "Hard",
  });

  function load() {
    getTennisMatches(365)
      .then(setMatches)
      .catch(() => setMatches([]));
  }
  useEffect(load, []);

  function setField<K extends keyof TennisMatch>(key: K, value: TennisMatch[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await createTennisMatch(form);
      showToast("Match logged.", "success");
      setForm({ date: today(), result: "Win", surface: "Hard" });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteTennisMatch(id);
      showToast("Deleted.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  async function onExpand(match: TennisMatch) {
    if (expandedId === match.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(match.id);
    if (!scoutingByMatch[match.id]) {
      try {
        const reports = await getMatchScouting(match.id);
        setScoutingByMatch((prev) => ({ ...prev, [match.id]: reports }));
      } catch {
        // no-op — leave empty
      }
    }
  }

  async function onGenerateScouting(matchId: string) {
    setScoutingLoading(matchId);
    try {
      const report = await generateMatchScouting(matchId);
      setScoutingByMatch((prev) => ({ ...prev, [matchId]: [report, ...(prev[matchId] || [])] }));
      showToast("Scouting report generated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't generate scouting.", "error");
    } finally {
      setScoutingLoading(null);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader title="Match Tracker" description="Every match, its full stats, and AI scouting after the fact." />

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Log a match</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Opponent">
            <input
              type="text"
              value={form.opponent || ""}
              onChange={(e) => setField("opponent", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Result">
            <select value={form.result || "Win"} onChange={(e) => setField("result", e.target.value)} className={inputClass}>
              <option>Win</option>
              <option>Loss</option>
            </select>
          </Field>
          <Field label="Score">
            <input
              type="text"
              value={form.score || ""}
              onChange={(e) => setField("score", e.target.value)}
              placeholder="6-4, 3-6, 7-5"
              className={inputClass}
            />
          </Field>
          <Field label="Surface">
            <select value={form.surface || "Hard"} onChange={(e) => setField("surface", e.target.value)} className={inputClass}>
              <option>Hard</option>
              <option>Clay</option>
              <option>Grass</option>
              <option>Indoor</option>
            </select>
          </Field>
          <Field label="Tournament (optional)">
            <input
              type="text"
              value={form.tournament || ""}
              onChange={(e) => setField("tournament", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => setShowStats((s) => !s)}
          className="text-xs text-accent hover:underline"
        >
          {showStats ? "Hide detailed stats" : "Add detailed stats (serve, rallies, etc.)"}
        </button>

        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="1st serve %">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.first_serve_pct ?? ""}
                onChange={(e) => setField("first_serve_pct", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="2nd serve %">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.second_serve_pct ?? ""}
                onChange={(e) => setField("second_serve_pct", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Aces">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.aces ?? ""}
                onChange={(e) => setField("aces", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Double faults">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.double_faults ?? ""}
                onChange={(e) => setField("double_faults", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Winners">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.winners ?? ""}
                onChange={(e) => setField("winners", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Unforced errors">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.unforced_errors ?? ""}
                onChange={(e) => setField("unforced_errors", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Break pts won">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.break_points_won ?? ""}
                onChange={(e) => setField("break_points_won", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Break pts total">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.break_points_total ?? ""}
                onChange={(e) => setField("break_points_total", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Net pts won">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.net_points_won ?? ""}
                onChange={(e) => setField("net_points_won", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Net pts total">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.net_points_total ?? ""}
                onChange={(e) => setField("net_points_total", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Return %">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.return_pct ?? ""}
                onChange={(e) => setField("return_pct", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Duration (min)">
              <input
                type="number"
                onFocus={(e) => e.target.select()}
                value={form.duration_min ?? ""}
                onChange={(e) => setField("duration_min", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
        )}

        <div>
          <Field label="Notes (optional)">
            <textarea
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              className={inputClass}
              rows={2}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Saving…" : "Log match"}
        </button>
      </form>

      <div className="space-y-3">
        {matches.length === 0 && <p className="text-sm text-fg-dim">No matches logged yet.</p>}
        {matches.map((m) => (
          <div key={m.id} className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => onExpand(m)} className="text-left flex-1">
                <p className="text-sm">
                  <span className={m.result === "Win" ? "text-accent" : "text-warn"}>{m.result}</span>{" "}
                  <span className="text-fg">vs {m.opponent || "unknown"}</span>
                </p>
                <p className="text-xs text-fg-dim">
                  {m.date} · {m.score || "no score"} {m.tournament ? `· ${m.tournament}` : ""}
                </p>
              </button>
              <Link
                href={`/tennis/matches/${m.id}`}
                className="text-xs text-accent hover:underline px-2 py-1 shrink-0"
              >
                Track points →
              </Link>
              <button onClick={() => onDelete(m.id)} className="text-xs text-fg-dim hover:text-warn px-2 py-1">
                Delete
              </button>
            </div>

            {expandedId === m.id && (
              <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-fg-muted">
                  {m.first_serve_pct !== null && <p>1st serve: {m.first_serve_pct}%</p>}
                  {m.aces !== null && <p>Aces: {m.aces}</p>}
                  {m.double_faults !== null && <p>Double faults: {m.double_faults}</p>}
                  {m.winners !== null && <p>Winners: {m.winners}</p>}
                  {m.unforced_errors !== null && <p>Unforced errors: {m.unforced_errors}</p>}
                  {m.break_points_total ? (
                    <p>
                      Break pts: {m.break_points_won}/{m.break_points_total}
                    </p>
                  ) : null}
                  {m.return_pct !== null && <p>Return %: {m.return_pct}</p>}
                </div>
                {m.notes && <p className="text-xs text-fg-dim italic">{m.notes}</p>}

                <button
                  onClick={() => onGenerateScouting(m.id)}
                  disabled={scoutingLoading === m.id}
                  className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors"
                >
                  {scoutingLoading === m.id ? "Analyzing…" : "Generate AI scouting report"}
                </button>

                {(scoutingByMatch[m.id] || []).map((report) => (
                  <div key={report.id} className="rounded-md bg-surface-panelHover p-3 space-y-1">
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
          </div>
        ))}
      </div>
    </main>
  );
}
