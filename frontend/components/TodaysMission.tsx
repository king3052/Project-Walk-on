"use client";

import { useEffect, useState } from "react";
import { getTodaysMission, toggleScheduledWorkoutComplete, type TodaysMission as TodaysMissionData } from "@/lib/api";

export function TodaysMission() {
  const [data, setData] = useState<TodaysMissionData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    getTodaysMission()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onToggle(id: string) {
    setData((prev) =>
      prev
        ? { ...prev, top_5: prev.top_5.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)) }
        : prev
    );
    try {
      await toggleScheduledWorkoutComplete(id);
    } finally {
      load();
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-panel p-6">
        <div className="skeleton h-5 w-40 mb-3" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-5/6" />
      </div>
    );
  }

  if (!data || data.total_items === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-accent/40 bg-surface-panel p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-fg-dim">Today&apos;s Mission</p>
        <p className="text-xs text-fg-dim">
          {data.completed_count}/{data.total_items} complete
        </p>
      </div>

      {data.focus_note && <p className="text-sm text-fg leading-relaxed">{data.focus_note}</p>}

      {data.top_5.length > 0 ? (
        <div className="space-y-1.5 pt-1">
          {data.top_5.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-panelHover cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => onToggle(item.id)}
                className="accent-[#4ADE80]"
              />
              <span className={`text-sm ${item.completed ? "text-fg-dim line-through" : "text-fg"}`}>
                {item.title}
              </span>
              <span className="text-xs text-fg-dim ml-auto">{item.workout_type}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fg-dim">Everything&apos;s done for today. 🎉</p>
      )}

      {data.remaining_beyond_top_5 > 0 && (
        <p className="text-xs text-fg-dim pt-1">
          +{data.remaining_beyond_top_5} more scheduled today — check Calendar for the full list.
        </p>
      )}
    </div>
  );
}
