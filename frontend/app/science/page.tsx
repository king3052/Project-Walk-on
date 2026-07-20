"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { getSportsScience, type SportsScienceData } from "@/lib/api";

const axisStyle = { fontSize: 11, fill: "#6B6B70" };
const tooltipStyle = {
  background: "#141414",
  border: "1px solid #242424",
  borderRadius: 8,
  fontSize: 12,
  color: "#F4F4F5",
};

function readinessColor(score: number): string {
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-fg";
  if (score >= 40) return "text-fg-muted";
  return "text-warn";
}

export default function SportsSciencePage() {
  const { userId } = useAuth();
  const [data, setData] = useState<SportsScienceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getSportsScience(userId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load."));
  }, [userId]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <PageHeader
        title="Sports Science Lab"
        description="Training load (duration x RPE), acute:chronic workload ratio, and a readiness score — directional signals, not a medical assessment."
      />

      {error && <p className="text-warn text-sm">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
              <p className="text-xs text-fg-dim">Acute load (7d avg)</p>
              <p className="font-display text-3xl text-fg tabular-nums mt-1">{data.acute_load}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
              <p className="text-xs text-fg-dim">Chronic load (28d avg)</p>
              <p className="font-display text-3xl text-fg tabular-nums mt-1">{data.chronic_load}</p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
              <p className="text-xs text-fg-dim">ACWR</p>
              <p className="font-display text-3xl text-accent tabular-nums mt-1">
                {data.acwr !== null ? data.acwr : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
              <p className="text-xs text-fg-dim">Readiness</p>
              <p className={`font-display text-3xl tabular-nums mt-1 ${readinessColor(data.readiness_score)}`}>
                {data.readiness_score}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <p className="text-sm text-fg mb-1">{data.readiness_label}</p>
            <p className="text-xs text-fg-dim">{data.readiness_note}</p>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-4">Daily training load — last 28 days</h2>
            {data.daily_load.some((d) => d.load > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.daily_load}>
                  <CartesianGrid stroke="#242424" vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="load" stroke="#4ADE80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-fg-dim py-8 text-center">
                No load data yet — log a Strength or Conditioning session with duration and RPE filled in
                from the Log page.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-2">How this works</h2>
            <p className="text-xs text-fg-dim leading-relaxed">
              Training load = session duration (minutes) x RPE (1-10 effort rating) — the standard
              &quot;session-RPE&quot; method. ACWR compares your last 7 days&apos; average load to your last 28
              days&apos; average. Research commonly cites roughly 0.8-1.3 as a lower-risk range, with values
              well above 1.3 associated with elevated injury risk and well below 0.8 suggesting detraining.
              This is a population-level heuristic to plan around, not a diagnosis.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
