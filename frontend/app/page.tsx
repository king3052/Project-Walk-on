"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getDashboard, getMe, getTennisMatches, getRankings, type DashboardData } from "@/lib/api";
import { StatCard, Section } from "@/components/StatCard";
import { TodaySchedule } from "@/components/TodaySchedule";
import { PlannerCard } from "@/components/PlannerCard";

const EMPTY: DashboardData = {
  athlete_score: 0,
  score_breakdown: {},
  weight_lb: null,
  goal_weight_lb: null,
  bench_lb: null,
  squat_lb: null,
  deadlift_lb: null,
  shots_this_week: 0,
  shooting_pct_this_week: 0,
  avg_sleep_this_week: null,
};

function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
      <div className="skeleton h-3 w-16 mb-3" />
      <div className="skeleton h-8 w-20" />
    </div>
  );
}

export default function DashboardPage() {
  const { userId } = useAuth();
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState("Basketball");
  const [tennisRecord, setTennisRecord] = useState<{ wins: number; losses: number } | null>(null);
  const [latestRating, setLatestRating] = useState<{ type: string; value: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    getDashboard(userId)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Couldn't load your dashboard.");
      })
      .finally(() => setLoading(false));

    getMe()
      .then((u) => {
        const userSport = u.sport || "Basketball";
        setSport(userSport);
        if (userSport === "Tennis") {
          getTennisMatches(365)
            .then((matches) => {
              setTennisRecord({
                wins: matches.filter((m) => m.result === "Win").length,
                losses: matches.filter((m) => m.result === "Loss").length,
              });
            })
            .catch(() => {});
          getRankings()
            .then((rankings) => {
              if (rankings.length === 0) return;
              const latest = [...rankings].sort((a, b) => b.date.localeCompare(a.date))[0];
              setLatestRating({ type: latest.ranking_type, value: latest.value });
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [userId]);

  const isTennis = sport === "Tennis";

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header className="flex items-baseline justify-between border-b border-surface-border pb-6">
        <div>
          <p className="text-xs tracking-wide text-accent mb-1">Overview</p>
          <h1 className="font-display text-4xl tracking-tight text-fg">Dashboard</h1>
        </div>
        <div className="text-right">
          <p className="text-xs tracking-wide text-fg-dim">Athlete score</p>
          {loading ? (
            <div className="skeleton h-12 w-20 ml-auto" />
          ) : (
            <p className="font-display text-5xl text-accent tabular-nums leading-none">
              {data.athlete_score}
              <span className="text-xl text-fg-dim">/100</span>
            </p>
          )}
          {!loading && Object.keys(data.score_breakdown).length > 0 && (
            <p className="text-xs text-fg-dim mt-1 space-x-2">
              {Object.entries(data.score_breakdown).map(([name, value]) => (
                <span key={name}>
                  {name} <span className="text-fg-muted">{Math.round(value)}</span>
                </span>
              ))}
            </p>
          )}
        </div>
      </header>

      {error && (
        <p className="text-warn text-sm rounded-md border border-warn/30 bg-warn/5 px-4 py-3">
          {error}
        </p>
      )}

      {isTennis && (
        <p className="text-xs text-fg-dim rounded-md border border-surface-border bg-surface-panel px-4 py-3">
          For full tennis stats (matches, strokes, tournaments, rankings), see your{" "}
          <Link href="/tennis" className="text-accent hover:underline">
            Tennis dashboard
          </Link>
          .
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <Section title="Body">
            <StatCard label="Weight" value={data.weight_lb ? `${data.weight_lb}` : "—"} sub="lbs" />
            {!isTennis && (
              <StatCard
                label="Goal weight"
                value={data.goal_weight_lb ? `${data.goal_weight_lb}` : "—"}
                sub="lbs"
                accent="accent"
              />
            )}
          </Section>

          <Section title="Strength">
            <StatCard label="Bench" value={data.bench_lb ? `${data.bench_lb}` : "—"} sub="lbs, est. 1RM" />
            <StatCard label="Squat" value={data.squat_lb ? `${data.squat_lb}` : "—"} sub="lbs, est. 1RM" />
            <StatCard label="Deadlift" value={data.deadlift_lb ? `${data.deadlift_lb}` : "—"} sub="lbs, est. 1RM" />
          </Section>

          {isTennis ? (
            <Section title="Tennis">
              <StatCard
                label="Match record"
                value={tennisRecord ? `${tennisRecord.wins}-${tennisRecord.losses}` : "—"}
                accent="accent"
              />
              <StatCard
                label={latestRating ? `${latestRating.type} rating` : "Rating"}
                value={latestRating ? latestRating.value : "—"}
              />
            </Section>
          ) : (
            <Section title="Basketball">
              <StatCard label="Shots this week" value={`${data.shots_this_week}`} />
              <StatCard label="Shooting %" value={`${data.shooting_pct_this_week}%`} accent="accent" />
            </Section>
          )}

          <Section title="Recovery">
            <StatCard
              label="Avg sleep"
              value={data.avg_sleep_this_week ? `${data.avg_sleep_this_week}h` : "—"}
            />
          </Section>

          <div className="grid md:grid-cols-2 gap-6">
            <PlannerCard />
            {userId && <TodaySchedule userId={userId} />}
          </div>
        </>
      )}
    </main>
  );
}
