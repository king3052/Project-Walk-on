"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import { ScoreBoard, PointLogView } from "@/components/TennisScoreBoard";
import {
  getTennisMatches,
  getMatchState,
  updateScoringSettings,
  addMatchPoint,
  addMatchPointsBulk,
  undoLastPoint,
  parseMatchPointsText,
  generateMatchScouting,
  getMatchScouting,
  type TennisMatch,
  type TennisMatchState,
  type TennisPointRecord,
  type TennisMatchScouting,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const FORMAT_LABELS: Record<string, string> = {
  best_of_3: "Best of 3 (full sets)",
  best_of_3_tb10: "Best of 3 (3rd set = 10-pt breaker)",
  single_set: "Single set",
  best_of_5: "Best of 5",
};

export default function MatchTrackerPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { showToast } = useToast();

  const [match, setMatch] = useState<TennisMatch | null>(null);
  const [state, setState] = useState<TennisMatchState | null>(null);
  const [tab, setTab] = useState<"live" | "bulk">("live");
  const [showLog, setShowLog] = useState(false);

  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [scoringFormat, setScoringFormat] = useState("best_of_3");
  const [noAd, setNoAd] = useState(false);
  const [firstServer, setFirstServer] = useState("Me");
  const [savingSettings, setSavingSettings] = useState(false);

  const [bulkText, setBulkText] = useState("");
  const [parsedPoints, setParsedPoints] = useState<TennisPointRecord[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [scouting, setScouting] = useState<TennisMatchScouting[]>([]);
  const [scoutingLoading, setScoutingLoading] = useState(false);

  function load() {
    getTennisMatches(730)
      .then((matches) => {
        const m = matches.find((mm) => mm.id === matchId) || null;
        setMatch(m);
      })
      .catch(() => {});
    getMatchState(matchId)
      .then((s) => {
        setState(s);
        if (s.settings) {
          setScoringFormat(s.settings.scoring_format);
          setNoAd(s.settings.no_ad);
          setFirstServer(s.settings.first_server);
        }
      })
      .catch(() => {});
  }

  useEffect(load, [matchId]);

  const hasPoints = !!state && state.sets.some((s) => s.games.some((g) => g.points.length > 0));

  async function onSaveSettings() {
    setSavingSettings(true);
    try {
      const s = await updateScoringSettings(matchId, {
        scoring_format: scoringFormat,
        no_ad: noAd,
        first_server: firstServer,
      });
      setState(s);
      showToast("Scoring settings saved.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  async function onAddPoint(won: boolean) {
    setSubmitting(true);
    try {
      const s = await addMatchPoint(matchId, description, won);
      setState(s);
      setDescription("");
      if (s.match_complete) {
        showToast(s.match_winner === "Me" ? "Match won! 🎾" : "Match logged.", "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onUndo() {
    try {
      const s = await undoLastPoint(matchId);
      setState(s);
      showToast("Last point undone.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Nothing to undo.", "error");
    }
  }

  async function onParse() {
    if (!bulkText.trim()) return;
    setParsing(true);
    try {
      const result = await parseMatchPointsText(matchId, bulkText);
      setParsedPoints(result.points);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't parse that.", "error");
    } finally {
      setParsing(false);
    }
  }

  function updateParsedPoint(index: number, field: "description" | "won", value: string | boolean) {
    setParsedPoints((prev) => {
      if (!prev) return prev;
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value } as TennisPointRecord;
      return copy;
    });
  }

  function removeParsedPoint(index: number) {
    setParsedPoints((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function onCommitParsed() {
    if (!parsedPoints || parsedPoints.length === 0) return;
    setCommitting(true);
    try {
      const s = await addMatchPointsBulk(matchId, parsedPoints);
      setState(s);
      setParsedPoints(null);
      setBulkText("");
      showToast(`Added ${parsedPoints.length} points.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setCommitting(false);
    }
  }

  async function onGenerateScouting() {
    setScoutingLoading(true);
    try {
      const report = await generateMatchScouting(matchId);
      setScouting((prev) => [report, ...prev]);
      showToast("Scouting report generated.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't generate scouting.", "error");
    } finally {
      setScoutingLoading(false);
    }
  }

  useEffect(() => {
    if (state?.match_complete) {
      getMatchScouting(matchId).then(setScouting).catch(() => {});
    }
  }, [state?.match_complete, matchId]);

  if (!state) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <TennisNav />
        <p className="text-sm text-fg-dim">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-6">
      <TennisNav />
      <PageHeader
        title={match ? `vs ${match.opponent || "Unknown"}` : "Match tracker"}
        description={match ? `${match.date}${match.tournament ? ` · ${match.tournament}` : ""}` : undefined}
      />

      <ScoreBoard state={state} />

      {!hasPoints && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-3">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim">Scoring settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-fg-dim block mb-1">Format</label>
              <select value={scoringFormat} onChange={(e) => setScoringFormat(e.target.value)} className={inputClass}>
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-dim block mb-1">Deuce scoring</label>
              <select
                value={noAd ? "no-ad" : "ad"}
                onChange={(e) => setNoAd(e.target.value === "no-ad")}
                className={inputClass}
              >
                <option value="ad">Ad (standard)</option>
                <option value="no-ad">No-Ad (sudden death)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-dim block mb-1">First server</label>
              <select value={firstServer} onChange={(e) => setFirstServer(e.target.value)} className={inputClass}>
                <option value="Me">You</option>
                <option value="Opponent">Opponent</option>
              </select>
            </div>
          </div>
          <button
            onClick={onSaveSettings}
            disabled={savingSettings}
            className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-1.5 rounded-md transition-colors"
          >
            {savingSettings ? "Saving…" : "Save settings"}
          </button>
        </div>
      )}
      {hasPoints && (
        <p className="text-xs text-fg-dim">
          {FORMAT_LABELS[scoringFormat]} · {noAd ? "No-Ad" : "Ad"} scoring — settings lock once points are logged.
        </p>
      )}

      {!state.match_complete && (
        <>
          <nav className="flex gap-1 border-b border-surface-border">
            <button
              onClick={() => setTab("live")}
              className={`text-sm px-4 py-2 border-b-2 transition-colors ${
                tab === "live" ? "border-accent text-accent" : "border-transparent text-fg-dim hover:text-fg-muted"
              }`}
            >
              Live
            </button>
            <button
              onClick={() => setTab("bulk")}
              className={`text-sm px-4 py-2 border-b-2 transition-colors ${
                tab === "bulk" ? "border-accent text-accent" : "border-transparent text-fg-dim hover:text-fg-muted"
              }`}
            >
              After the fact
            </button>
          </nav>

          {tab === "live" && (
            <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
              <label className="text-xs text-fg-dim block mb-1">Describe the point (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Good serve and rally, BH wide error…"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onAddPoint(true)}
                  disabled={submitting}
                  className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep py-3 rounded-md transition-colors font-medium"
                >
                  Won point
                </button>
                <button
                  onClick={() => onAddPoint(false)}
                  disabled={submitting}
                  className="text-sm bg-warn/20 hover:bg-warn/30 disabled:opacity-50 text-warn py-3 rounded-md transition-colors font-medium"
                >
                  Lost point
                </button>
              </div>
              <button onClick={onUndo} className="text-xs text-fg-dim hover:text-warn transition-colors">
                Undo last point
              </button>
            </div>
          )}

          {tab === "bulk" && (
            <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
              <p className="text-xs text-fg-dim">
                Paste your notes for a game (or several) — your own shorthand is fine. AI will split it into
                individual points for you to review before anything is saved.
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Good serve. BH return to net. Good serve and rally. FH wide error. Won."
                className={inputClass}
                rows={5}
              />
              <button
                onClick={onParse}
                disabled={parsing || !bulkText.trim()}
                className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
              >
                {parsing ? "Parsing…" : "Parse with AI"}
              </button>

              {parsedPoints && (
                <div className="space-y-2 pt-2 border-t border-surface-border">
                  <p className="text-xs text-fg-dim">Review before saving — edit or remove anything that's wrong:</p>
                  {parsedPoints.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={p.description}
                        onChange={(e) => updateParsedPoint(i, "description", e.target.value)}
                        className={inputClass}
                      />
                      <select
                        value={p.won ? "won" : "lost"}
                        onChange={(e) => updateParsedPoint(i, "won", e.target.value === "won")}
                        className={`${inputClass} w-28 shrink-0`}
                      >
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                      <button
                        onClick={() => removeParsedPoint(i)}
                        className="text-xs text-fg-dim hover:text-warn px-2 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={onCommitParsed}
                    disabled={committing || parsedPoints.length === 0}
                    className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
                  >
                    {committing ? "Saving…" : `Confirm and add ${parsedPoints.length} points`}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {state.match_complete && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">AI scouting</h2>
            <button
              onClick={onGenerateScouting}
              disabled={scoutingLoading}
              className="text-xs text-accent hover:text-accent-dim disabled:opacity-50 transition-colors"
            >
              {scoutingLoading ? "Analyzing…" : "Generate report"}
            </button>
          </div>
          {scouting.map((report) => (
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

      <button onClick={() => setShowLog((v) => !v)} className="text-xs text-fg-dim hover:text-accent transition-colors">
        {showLog ? "Hide" : "Show"} full point-by-point log
      </button>
      {showLog && <PointLogView state={state} />}
    </main>
  );
}
