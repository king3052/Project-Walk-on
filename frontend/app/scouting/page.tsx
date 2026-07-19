"use client";

import { useEffect, useState } from "react";
import { getScoutingReports, generateScoutingReport, type ScoutingReport } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

function gradeColor(grade: string | null): string {
  if (!grade) return "text-fg-dim";
  const letter = grade[0].toUpperCase();
  if (letter === "A" || letter === "B") return "text-accent";
  if (letter === "C") return "text-fg";
  return "text-warn";
}

export default function ScoutingPage() {
  const [reports, setReports] = useState<ScoutingReport[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadReports() {
    if (!DEMO_USER_ID) return;
    getScoutingReports(DEMO_USER_ID)
      .then(setReports)
      .catch(() => setReports([]));
  }

  useEffect(loadReports, []);

  async function onGenerate() {
    setPending(true);
    setError(null);
    try {
      await generateScoutingReport(DEMO_USER_ID);
      loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
      <PageHeader
        title="Scouting report"
        description="A monthly evaluation generated from your real testing, strength, and shooting data — as if a college coach wrote it."
      />

      <div>
        <button
          onClick={onGenerate}
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Generating…" : "Generate this month's report"}
        </button>
        {error && <p className="text-warn text-sm mt-2">{error}</p>}
      </div>

      <div className="space-y-6">
        {reports.length === 0 && (
          <p className="text-sm text-fg-dim">No reports generated yet — click the button above.</p>
        )}
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border border-surface-border bg-surface-panel p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-fg-dim">Report — {r.report_month}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-fg-dim">Overall grade</p>
                <p className={`font-display text-4xl leading-none ${gradeColor(r.overall_grade)}`}>
                  {r.overall_grade || "—"}
                </p>
              </div>
            </div>

            {r.strengths && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">Strengths</p>
                <ul className="space-y-1">
                  {r.strengths.split("\n").filter(Boolean).map((s, i) => (
                    <li key={i} className="text-sm text-fg flex gap-2">
                      <span className="text-accent">✔</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.needs_improvement && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">Needs improvement</p>
                <ul className="space-y-1">
                  {r.needs_improvement.split("\n").filter(Boolean).map((s, i) => (
                    <li key={i} className="text-sm text-fg flex gap-2">
                      <span className="text-warn">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {r.next_priority && (
              <div className="border-t border-surface-border pt-3">
                <p className="text-xs uppercase tracking-wide text-fg-dim mb-1">Next priority</p>
                <p className="text-sm text-accent">{r.next_priority}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
