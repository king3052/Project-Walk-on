"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { getFilmSessions, createFilmSession, addFilmTag, analyzeFilmPatterns, type FilmSession } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

const today = () => new Date().toISOString().slice(0, 10);

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const TAG_TYPES = [
  { value: "good_possession", label: "Good possession" },
  { value: "bad_turnover", label: "Bad turnover" },
  { value: "late_rotation", label: "Late rotation" },
  { value: "missed_closeout", label: "Missed closeout" },
  { value: "shot_selection", label: "Shot selection" },
];

function TagForm({ sessionId, onAdded }: { sessionId: string; onAdded: () => void }) {
  const [timestamp, setTimestamp] = useState(0);
  const [tagType, setTagType] = useState(TAG_TYPES[0].value);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await addFilmTag(sessionId, timestamp, tagType, note || undefined);
      setNote("");
      setTimestamp(0);
      onAdded();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 mt-3">
      <div className="w-20">
        <label className="text-xs text-fg-dim block mb-1">Sec</label>
        <input
          type="number"
            onFocus={(e) => e.target.select()}
          value={timestamp}
          onChange={(e) => setTimestamp(Number(e.target.value))}
          className={inputClass}
        />
      </div>
      <div className="w-44">
        <label className="text-xs text-fg-dim block mb-1">Tag</label>
        <select value={tagType} onChange={(e) => setTagType(e.target.value)} className={inputClass}>
          {TAG_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="text-xs text-fg-dim block mb-1">Note</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-4 py-2 rounded-md transition-colors"
      >
        Tag
      </button>
    </form>
  );
}

export default function FilmPage() {
  const { userId } = useAuth();
  const [sessions, setSessions] = useState<FilmSession[]>([]);
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [date, setDate] = useState(today());
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function onAnalyze() {
    setAnalyzing(true);
    try {
      const result = await analyzeFilmPatterns();
      setAnalysis(result.analysis);
    } catch (err) {
      setAnalysis(err instanceof Error ? err.message : "Couldn't analyze right now.");
    } finally {
      setAnalyzing(false);
    }
  }

  function loadSessions() {
    if (!userId) return;
    getFilmSessions(userId)
      .then(setSessions)
      .catch(() => setSessions([]));
  }

  useEffect(loadSessions, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setPending(true);
    setStatus(null);
    try {
      await createFilmSession(userId, date, title, videoUrl);
      setTitle("");
      setVideoUrl("");
      setStatus({ type: "success", text: "Film session added." });
      loadSessions();
    } catch (err) {
      setStatus({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <PageHeader
        title="Film room"
        description="Paste a link to game or practice film (YouTube, Google Drive, Hudl…) and tag moments with a timestamp."
      />

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Add film</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pickup run — Tuesday"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Video link</label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Adding…" : "Add film"}
        </button>
        {status && (
          <p className={status.type === "success" ? "text-accent text-sm" : "text-warn text-sm"}>{status.text}</p>
        )}
      </form>

      <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim">Pattern analysis</h2>
          <button
            onClick={onAnalyze}
            disabled={analyzing}
            className="text-xs text-accent hover:text-accent-dim disabled:opacity-50 transition-colors"
          >
            {analyzing ? "Analyzing…" : analysis ? "Re-analyze" : "Analyze patterns"}
          </button>
        </div>
        {analysis ? (
          <p className="text-sm text-fg leading-relaxed">{analysis}</p>
        ) : (
          <p className="text-sm text-fg-dim">Looks across all your tagged film for recurring patterns.</p>
        )}
      </div>

      <div className="space-y-4">
        {sessions.length === 0 && <p className="text-sm text-fg-dim">No film logged yet.</p>}
        {sessions.map((s) => (
          <div key={s.id} className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-fg">{s.title}</p>
                <a
                  href={s.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  {s.video_url}
                </a>
              </div>
              <p className="text-xs text-fg-dim">{s.date}</p>
            </div>
            {s.tags.length > 0 && (
              <ul className="mt-3 space-y-1">
                {s.tags
                  .sort((a, b) => a.timestamp_sec - b.timestamp_sec)
                  .map((t) => (
                    <li key={t.id} className="text-xs text-fg-muted">
                      <span className="text-accent tabular-nums">
                        {Math.floor(t.timestamp_sec / 60)}:{String(t.timestamp_sec % 60).padStart(2, "0")}
                      </span>{" "}
                      — {TAG_TYPES.find((tt) => tt.value === t.tag_type)?.label || t.tag_type}
                      {t.note ? ` — ${t.note}` : ""}
                    </li>
                  ))}
              </ul>
            )}
            <TagForm sessionId={s.id} onAdded={loadSessions} />
          </div>
        ))}
      </div>
    </main>
  );
}
