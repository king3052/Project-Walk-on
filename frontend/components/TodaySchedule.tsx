"use client";

import { useEffect, useState } from "react";
import { getScheduledWorkouts, toggleScheduledWorkoutComplete, type ScheduledWorkout } from "@/lib/api";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TodaySchedule({ userId }: { userId: string }) {
  const [items, setItems] = useState<ScheduledWorkout[]>([]);
  const todayISO = toISODate(new Date());

  function load() {
    getScheduledWorkouts(userId, todayISO, todayISO)
      .then(setItems)
      .catch(() => setItems([]));
  }

  useEffect(load, [userId]);

  async function toggle(id: string) {
    await toggleScheduledWorkoutComplete(id);
    load();
  }

  const done = items.filter((i) => i.completed).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const grouped = items.reduce<Record<string, ScheduledWorkout[]>>((acc, item) => {
    (acc[item.workout_type] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Today&apos;s schedule</h2>
        {items.length > 0 && (
          <span className="font-display text-xl text-accent tabular-nums">{pct}%</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-fg-dim">
          Nothing scheduled for today — add items from the Calendar page, or load your weekly template there.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <p className="text-xs text-fg-dim mb-1">{category}</p>
              <ul className="space-y-1">
                {categoryItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-center gap-3 text-left rounded-md px-2 py-1.5 hover:bg-surface-panelHover transition-colors"
                    >
                      <span
                        className={`h-4 w-4 shrink-0 rounded border ${
                          item.completed ? "bg-accent border-accent" : "border-surface-border"
                        }`}
                      />
                      <span className={item.completed ? "text-fg-dim line-through" : "text-fg"}>
                        {item.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
