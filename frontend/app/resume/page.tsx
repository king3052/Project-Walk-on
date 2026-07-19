"use client";

import { useEffect, useState } from "react";
import { getUser, getProfile, getDashboard, getAchievements, type UserRecord, type AthleteProfile, type DashboardData, type Achievement } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between py-1 border-b border-surface-border last:border-0">
      <span className="text-fg-dim">{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

export default function ResumePage() {
  const [user, setUser] = useState<UserRecord | null>(null);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (!DEMO_USER_ID) return;
    getUser(DEMO_USER_ID).then(setUser).catch(() => {});
    getProfile(DEMO_USER_ID).then(setProfile).catch(() => {});
    getDashboard(DEMO_USER_ID).then(setDashboard).catch(() => {});
    getAchievements(DEMO_USER_ID).then(setAchievements).catch(() => {});
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
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8 print:max-w-none">
      <div className="print:hidden">
        <NavBar />
      </div>

      <header className="border-b border-surface-border pb-6 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-wide text-accent mb-1">Athlete resume</p>
          <h1 className="font-display text-3xl tracking-tight text-fg">{user?.name || "—"}</h1>
          <p className="text-sm text-fg-dim">{user?.position || ""}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="print:hidden text-sm bg-accent hover:bg-accent-dim text-accent-deep px-4 py-2 rounded-md transition-colors"
        >
          Print / Save as PDF
        </button>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">Measurements</h2>
          <Row label="Height" value={user?.height_in ? `${user.height_in} in` : null} />
          <Row label="Weight" value={user?.weight_lb ? `${user.weight_lb} lb` : null} />
          <Row label="Wingspan" value={profile?.wingspan_in ? `${profile.wingspan_in} in` : null} />
          <Row label="Standing reach" value={profile?.standing_reach_in ? `${profile.standing_reach_in} in` : null} />
          <Row label="Body fat" value={profile?.body_fat_pct ? `${profile.body_fat_pct}%` : null} />
          <Row label="Dominant hand" value={user?.dominant_hand} />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">Athletic testing</h2>
          <Row label="Vertical jump" value={profile?.vertical_in ? `${profile.vertical_in} in` : null} />
          <Row label="Broad jump" value={profile?.broad_jump_in ? `${profile.broad_jump_in} in` : null} />
          <Row label="20m sprint" value={profile?.sprint_20m_sec ? `${profile.sprint_20m_sec} sec` : null} />
          <Row label="Lane agility" value={profile?.lane_agility_sec ? `${profile.lane_agility_sec} sec` : null} />
          <Row label="Max pull-ups" value={profile?.max_pullups} />
          <Row label="Max push-ups" value={profile?.max_pushups} />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">Strength</h2>
          <Row label="Bench (est. 1RM)" value={dashboard?.bench_lb ? `${dashboard.bench_lb} lb` : null} />
          <Row label="Squat (est. 1RM)" value={dashboard?.squat_lb ? `${dashboard.squat_lb} lb` : null} />
          <Row label="Deadlift (est. 1RM)" value={dashboard?.deadlift_lb ? `${dashboard.deadlift_lb} lb` : null} />
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">Basketball</h2>
          <Row label="Shooting % (this week)" value={dashboard ? `${dashboard.shooting_pct_this_week}%` : null} />
          <Row label="Athlete score" value={dashboard ? `${dashboard.athlete_score}/100` : null} />
        </div>
      </div>

      {achievements.some((a) => a.earned) && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
          <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-3">Achievements</h2>
          <ul className="space-y-1">
            {achievements
              .filter((a) => a.earned)
              .map((a) => (
                <li key={a.key} className="text-sm text-fg">
                  {a.name}
                </li>
              ))}
          </ul>
        </div>
      )}
    </main>
  );
}
