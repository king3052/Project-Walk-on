"use client";

import { useEffect, useState } from "react";
import { getMorningBriefing, type MorningBriefing as MorningBriefingData } from "@/lib/api";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function readinessColor(score: number): string {
  if (score >= 80) return "text-accent";
  if (score >= 60) return "text-fg";
  return "text-warn";
}

export function MorningBriefing({ sport }: { sport: string }) {
  const [data, setData] = useState<MorningBriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMorningBriefing()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load your briefing."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-panel p-6">
        <div className="skeleton h-6 w-48 mb-3" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-3/4" />
      </div>
    );
  }

  if (error || !data) {
    return null; // fail quiet — the rest of the dashboard still works fine without this
  }

  const showWeightGoal = sport !== "Tennis" && data.weight_projection;

  return (
    <div className="rounded-lg border border-accent/40 bg-surface-panel p-6 space-y-4">
      <div>
        <p className="font-display text-2xl text-fg">
          {getGreeting()}{data.player_name ? `, ${data.player_name}` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-fg-dim">Readiness</p>
          <p className={`font-display text-3xl tabular-nums ${readinessColor(data.readiness.readiness_score)}`}>
            {data.readiness.readiness_score}
            <span className="text-sm text-fg-dim">/100</span>
          </p>
          <p className="text-xs text-fg-dim">{data.readiness.readiness_label}</p>
        </div>

        {showWeightGoal && data.weight_projection && (
          <div>
            <p className="text-xs uppercase tracking-wide text-fg-dim">Weight goal</p>
            {data.weight_projection.status === "on_track" ? (
              <>
                <p className="font-display text-3xl text-fg tabular-nums">
                  {data.weight_projection.current_weight_lb}
                  <span className="text-sm text-fg-dim">/{data.weight_projection.goal_weight_lb} lb</span>
                </p>
                <p className="text-xs text-fg-dim">
                  {(data.weight_projection.rate_lb_per_week ?? 0) > 0 ? "+" : ""}
                  {data.weight_projection.rate_lb_per_week}lb/wk — on pace for {data.weight_projection.projected_date}
                </p>
              </>
            ) : data.weight_projection.status === "stalled_or_wrong_direction" ? (
              <p className="text-xs text-warn">Trend is flat or moving the wrong way</p>
            ) : (
              <p className="text-xs text-fg-dim">Log a few more weigh-ins for a trend</p>
            )}
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wide text-fg-dim">Today</p>
          <p className="font-display text-3xl text-fg tabular-nums">{data.todays_items.length}</p>
          <p className="text-xs text-fg-dim">scheduled item{data.todays_items.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-surface-border">
        <p className="text-xs uppercase tracking-wide text-fg-dim mb-1">Today&apos;s priority</p>
        <p className="text-sm text-fg leading-relaxed">{data.priority_narrative}</p>
      </div>
    </div>
  );
}
