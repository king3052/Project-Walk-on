"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import { toLocalISODate } from "@/lib/date";
import {
  getTennisMatches,
  getTournaments,
  getRankings,
  getStrokeLogs,
  getRecoveryLogs,
  getDashboard,
  type TennisMatch,
  type TennisTournament,
  type TennisRanking,
} from "@/lib/api";

function Widget({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel px-5 py-4">
      <p className="text-xs text-fg-dim">{label}</p>
      <p className="font-display text-3xl text-fg tabular-nums mt-1">{value}</p>
      {sub && <p className="text-xs text-fg-dim mt-1">{sub}</p>}
    </div>
  );
}

function todayISO() {
  return toLocalISODate();
}

function computeStreak(dates: string[]): number {
  const unique = Array.from(new Set(dates)).sort().reverse();
  if (unique.length === 0) return 0;
  const today = todayISO();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = toLocalISODate(yesterday);
  if (unique[0] !== today && unique[0] !== yesterdayISO) return 0;

  let streak = 1;
  let cursor = new Date(unique[0] + "T00:00:00");
  for (let i = 1; i < unique.length; i++) {
    cursor.setDate(cursor.getDate() - 1);
    const expected = toLocalISODate(cursor);
    if (unique[i] === expected) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function TennisOverviewPage() {
  const { userId } = useAuth();
  const [matches, setMatches] = useState<TennisMatch[]>([]);
  const [tournaments, setTournaments] = useState<TennisTournament[]>([]);
  const [rankings, setRankings] = useState<TennisRanking[]>([]);
  const [streak, setStreak] = useState(0);
  const [avgSleep, setAvgSleep] = useState<number | null>(null);
  const [athleteScore, setAthleteScore] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    getTennisMatches(365).then(setMatches).catch(() => setMatches([]));
    getTournaments().then(setTournaments).catch(() => setTournaments([]));
    getRankings().then(setRankings).catch(() => setRankings([]));
    getStrokeLogs(30)
      .then((logs) => setStreak(computeStreak(logs.map((l) => l.date))))
      .catch(() => setStreak(0));
    getRecoveryLogs(userId, 7)
      .then((logs) => {
        const withSleep = logs.filter((l) => l.sleep_hours);
        if (withSleep.length) {
          setAvgSleep(
            Math.round((withSleep.reduce((s, l) => s + (l.sleep_hours || 0), 0) / withSleep.length) * 10) / 10
          );
        }
      })
      .catch(() => {});
    getDashboard(userId)
      .then((d) => setAthleteScore(d.athlete_score))
      .catch(() => {});
  }, [userId]);

  const wins = matches.filter((m) => m.result === "Win").length;
  const losses = matches.filter((m) => m.result === "Loss").length;

  const upcomingTournaments = tournaments
    .filter((t) => t.start_date && t.start_date >= todayISO())
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));

  const weeklyHours = (() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = toLocalISODate(weekAgo);
    const minutes = matches
      .filter((m) => m.date >= weekAgoISO)
      .reduce((sum, m) => sum + (m.duration_min || 0), 0);
    return Math.round((minutes / 60) * 10) / 10;
  })();

  const latestByType: Record<string, TennisRanking> = {};
  rankings.forEach((r) => {
    if (!latestByType[r.ranking_type] || r.date > latestByType[r.ranking_type].date) {
      latestByType[r.ranking_type] = r;
    }
  });
  const latestRankings = Object.values(latestByType);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader title="Tennis" description="Your tennis-specific dashboard — separate from the general one." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Widget label="Athlete score" value={athleteScore !== null ? `${athleteScore}` : "—"} sub="/100" />
        <Widget label="Match record" value={`${wins}-${losses}`} sub={`${matches.length} logged`} />
        <Widget label="Practice streak" value={`${streak}`} sub="days" />
        <Widget label="Weekly hours" value={`${weeklyHours}`} sub="match hours, last 7d" />
        <Widget label="Recovery — avg sleep" value={avgSleep !== null ? `${avgSleep}h` : "—"} sub="last 7 days" />
        {latestRankings.slice(0, 3).map((r) => (
          <Widget key={r.ranking_type} label={`${r.ranking_type} rating`} value={r.value} sub={r.date} />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Upcoming tournaments</h2>
            <Link href="/tennis/tournaments" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          {upcomingTournaments.length === 0 ? (
            <p className="text-sm text-fg-dim">Nothing scheduled.</p>
          ) : (
            <ul className="space-y-2">
              {upcomingTournaments.slice(0, 4).map((t) => (
                <li key={t.id} className="text-sm">
                  <span className="text-fg">{t.name}</span>{" "}
                  <span className="text-fg-dim">— {t.start_date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Recent matches</h2>
            <Link href="/tennis/matches" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          {matches.length === 0 ? (
            <p className="text-sm text-fg-dim">No matches logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {matches.slice(0, 4).map((m) => (
                <li key={m.id} className="text-sm">
                  <span className={m.result === "Win" ? "text-accent" : "text-warn"}>{m.result || "—"}</span>{" "}
                  <span className="text-fg">vs {m.opponent || "unknown"}</span>{" "}
                  <span className="text-fg-dim">— {m.date}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
