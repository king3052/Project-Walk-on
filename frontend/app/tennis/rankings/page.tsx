"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import { getRankings, createRanking, deleteRanking, type TennisRanking } from "@/lib/api";

const today = () => new Date().toISOString().slice(0, 10);
const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

const RANKING_TYPES = ["UTR", "USTA", "ITF", "ATP", "WTA", "School", "State", "National"];

const axisStyle = { fontSize: 11, fill: "#6B6B70" };
const tooltipStyle = { background: "#141414", border: "1px solid #242424", borderRadius: 8, fontSize: 12, color: "#F4F4F5" };

export default function TennisRankingsPage() {
  const { showToast } = useToast();
  const [rankings, setRankings] = useState<TennisRanking[]>([]);
  const [date, setDate] = useState(today());
  const [rankingType, setRankingType] = useState("UTR");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [chartType, setChartType] = useState("UTR");

  function load() {
    getRankings()
      .then(setRankings)
      .catch(() => setRankings([]));
  }
  useEffect(load, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setPending(true);
    try {
      await createRanking(date, rankingType, value);
      showToast("Ranking logged.", "success");
      setValue("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await deleteRanking(id);
      showToast("Removed.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  const availableTypes = Array.from(new Set(rankings.map((r) => r.ranking_type)));
  const chartData = rankings
    .filter((r) => r.ranking_type === chartType)
    .map((r) => ({ date: r.date, value: Number(r.value) || 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader title="Rankings" description="UTR, USTA, ITF, ATP/WTA, and school/state/national — tracked over time." />

      <form onSubmit={onSubmit} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Log a rating</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-fg-dim block mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-fg-dim block mb-1">Type</label>
            <select value={rankingType} onChange={(e) => setRankingType(e.target.value)} className={inputClass}>
              {RANKING_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-fg-dim block mb-1">Value</label>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 8.5 or #42"
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {pending ? "Saving…" : "Log rating"}
        </button>
      </form>

      {availableTypes.length > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Trend</h2>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="text-xs bg-surface-panelHover border border-surface-border rounded-md px-2 py-1 text-fg-dim"
            >
              {availableTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#242424" vertical={false} />
                <XAxis dataKey="date" tick={axisStyle} axisLine={{ stroke: "#242424" }} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="#4ADE80" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-fg-dim py-8 text-center">Log at least 2 entries of this type to see a trend.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {rankings.length === 0 && <p className="text-sm text-fg-dim">No rankings logged yet.</p>}
        {rankings.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border border-surface-border bg-surface-panel p-3 flex items-center justify-between"
          >
            <p className="text-sm text-fg">
              <span className="text-accent">{r.ranking_type}</span>: {r.value}{" "}
              <span className="text-fg-dim">— {r.date}</span>
            </p>
            <button onClick={() => onDelete(r.id)} className="text-xs text-fg-dim hover:text-warn px-2 py-1">
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
