"use client";

import { useState } from "react";

type MissionItem = { id: string; label: string; done: boolean };

const initialItems: MissionItem[] = [
  { id: "lift", label: "Lower body strength", done: true },
  { id: "shots", label: "500 makes", done: false },
  { id: "film", label: "Film study — 20 min", done: false },
  { id: "meal", label: "Meal goal — 3,500 cal / 180g protein", done: false },
  { id: "mobility", label: "Mobility + 8h sleep", done: false },
];

export function Mission() {
  const [items, setItems] = useState(initialItems);
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  function toggle(id: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  return (
    <div className="rounded-md border border-court-line bg-court-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg uppercase tracking-widest text-chalk-muted">
          Today&apos;s Mission
        </h2>
        <span className="font-display text-2xl text-hardwood-light tabular-nums">{pct}%</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => toggle(item.id)}
              className="w-full flex items-center gap-3 text-left rounded px-2 py-2 hover:bg-court-panelLight transition-colors"
            >
              <span
                className={`h-4 w-4 shrink-0 rounded-sm border ${
                  item.done ? "bg-hardwood border-hardwood" : "border-chalk-dim"
                }`}
              />
              <span className={item.done ? "text-chalk-muted line-through" : "text-chalk"}>
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
