"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getAchievements, type Achievement } from "@/lib/api";

export default function AchievementsPage() {
  const { userId } = useAuth();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!userId) return;
    getAchievements(userId)
      .then(setAchievements)
      .catch(() => setAchievements([]));
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
<PageHeader title="Achievements" />

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
