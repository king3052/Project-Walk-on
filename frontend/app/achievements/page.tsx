"use client";

import { useEffect, useState } from "react";
import { getAchievements, type Achievement } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!DEMO_USER_ID) return;
    getAchievements(DEMO_USER_ID)
      .then(setAchievements)
      .catch(() => setAchievements([]));
  }, []);

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
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <NavBar />
      <header className="border-b border-surface-border pb-6">
        <p className="text-xs tracking-wide text-accent mb-1">Project Walk-On</p>
        <h1 className="font-display text-3xl tracking-tight text-fg">Achievements</h1>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {achievements.map((a) => {
          const pct = Math.min(100, Math.round((a.progress_current / a.progress_target) * 100));
          return (
            <div
              key={a.key}
              className={`rounded-lg border p-5 ${
                a.earned ? "border-accent bg-surface-panel" : "border-surface-border bg-surface-panel"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className={`text-sm ${a.earned ? "text-accent" : "text-fg"}`}>{a.name}</p>
                {a.earned && <span className="text-xs text-accent">Earned</span>}
              </div>
              <p className="text-xs text-fg-dim mb-3">{a.description}</p>
              <div className="h-1.5 bg-surface-panelHover rounded-full overflow-hidden">
                <div
                  className={`h-full ${a.earned ? "bg-accent" : "bg-fg-dim"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-fg-dim mt-1">
                {a.progress_current} / {a.progress_target}
              </p>
            </div>
          );
        })}
      </div>
    </main>
  );
}
