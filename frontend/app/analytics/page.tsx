"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getAnalytics, getMe, getStrokeLogs, getTennisMatches, type AnalyticsData } from "@/lib/api";
import { ActivityCalendar } from "@/components/ActivityCalendar";
import { PageHeader } from "@/components/PageHeader";

const LINE_COLORS = ["#4ADE80", "#A1A1AA", "#F87171", "#60A5FA"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
      <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-4">{title}</h2>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-fg-dim py-8 text-center">{text}</p>;
}

const axisStyle = { fontSize: 11, fill: "#6B6B70" };
const tooltipStyle = {
  background: "#141414",
  border: "1px solid #242424",
  borderRadius: 8,
  fontSize: 12,
  color: "#F4F4F5",
};

function pivotStrength(strength: AnalyticsData["strength"]) {
  const byDate = new Map<string, Record<string, number | string>>();
  const exercises = new Set<string>();
  for (const point of strength) {
    exercises.add(point.exercise);
    const row = byDate.get(point.date) || { date: point.date };
    const existing = row[point.exercise];
    if (typeof existing !== "number" || point.estimated_1rm > existing) {
      row[point.exercise] = point.estimated_1rm;
    }
    byDate.set(point.date, row);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { rows, exercises: Array.from(exercises) };
}

function aggregateShooting(shooting: AnalyticsData["shooting"]) {
  const byDate = new Map<string, { attempts: number; makes: number }>();
  for (const point of shooting) {
    const entry = byDate.get(point.date) || { attempts: 0, makes: 0 };
    entry.attempts += point.attempts;
    entry.makes += point.makes;
    byDate.set(point.date, entry);
  }
  return Array.from(byDate.entries())
    .map(([date, { attempts, makes }]) => ({
      date,
      pct: attempts ? Math.round((makes / attempts) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function AnalyticsPage() {
  const { userId } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState(90);
  const [sport, setSport] = useState("Basketball");
  const [strokeSeries, setStrokeSeries] = useState<{ date: string; pct: number }[]>([]);
  const [serveSeries, setServeSeries] = useState<{ date: string; pct: number }[]>([]);

  useEffect(() => {
    if (!userId) return;
    getAnalytics(userId, range)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics."));
  }, [userId, range]);

  useEffect(() => {
    getMe()
      .then((u) => setSport(u.sport || "Basketball"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (sport !== "Tennis") return;
    getStrokeLogs(range)
      .then((logs) => {
        const byDate = new Map<string, { attempts: number; makes: number }>();
        logs.forEach((l) => {
          const entry = byDate.get(l.date) || { attempts: 0, makes: 0 };
          entry.attempts += l.attempts;
          entry.makes += l.makes;
          byDate.set(l.date, entry);
        });
        setStrokeSeries(
          Array.from(byDate.entries())
            .map(([date, { attempts, makes }]) => ({
              date,
              pct: attempts ? Math.round((makes / attempts) * 1000) / 10 : 0,
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
        );
      })
      .catch(() => setStrokeSeries([]));

    getTennisMatches(range)
      .then((matches) => {
        setServeSeries(
          matches
            .filter((m) => m.first_serve_pct !== null)
            .map((m) => ({ date: m.date, pct: m.first_serve_pct as number }))
            .sort((a, b) => a.date.localeCompare(b.date))
        );
      })
      .catch(() => setServeSeries([]));
  }, [sport, range]);

  const strengthPivot = data ? pivotStrength(data.strength) : { rows: [], exercises: [] };
  const shootingSeries = data ? aggregateShooting(data.shooting) : [];
  const isTennis = sport === "Tennis";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <PageHeader title="Analytics" />

      <div className="flex gap-2">
        {[30, 90, 180, 365].map((d) => (
          <button
            key={d}
            onClick={() => setRange(d)}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
              range === d ? "bg-accent text-accent-deep" : "text-fg-dim hover:bg-surface-panelHover"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {error && <p className="text-warn text-sm">{error}</p>}

      <ChartCard title="Bodyweight">
        {data && data.weight.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.weight}>
              <CartesianGrid stroke="#242424" vertical={false} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="weight_lb" stroke="#4ADE80" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No bodyweight entries yet — log one from the Body tab." />
        )}
      </ChartCard>

      <ChartCard title="Strength — estimated 1RM">
        {strengthPivot.rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={strengthPivot.rows}>
              <CartesianGrid stroke="#242424" vertical={false} />
              <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={tooltipStyle} />
              {strengthPivot.exercises.map((exercise, i) => (
                <Line
                  key={exercise}
                  type="monotone"
                  dataKey={exercise}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No strength sessions yet — log one from the Strength tab." />
        )}
      </ChartCard>

      {isTennis ? (
        <>
          <ChartCard title="Stroke consistency by day">
            {strokeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={strokeSeries}>
                  <CartesianGrid stroke="#242424" vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="pct" stroke="#4ADE80" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No strokes logged yet — log some from the Tennis → Strokes page." />
            )}
          </ChartCard>

          <ChartCard title="First serve % by match">
            {serveSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={serveSeries}>
                  <CartesianGrid stroke="#242424" vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="pct" stroke="#60A5FA" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No match serve stats logged yet — add detailed stats when logging a match." />
            )}
          </ChartCard>
        </>
      ) : (
        <ChartCard title="Shooting % by day">
          {shootingSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={shootingSeries}>
                <CartesianGrid stroke="#242424" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={36} unit="%" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="pct" stroke="#4ADE80" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No shooting sessions yet — log one from the Shooting tab." />
          )}
        </ChartCard>
      )}

      <ActivityCalendar activeDates={data?.active_dates || []} />
    </main>
  );
}
