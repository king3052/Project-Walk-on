"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getProfile, saveProfile, type AthleteProfile } from "@/lib/api";

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

type FieldDef = { key: keyof AthleteProfile; label: string; suffix?: string; type?: "text" | "number" };

const MEASUREMENTS: FieldDef[] = [
  { key: "age", label: "Age" },
  { key: "shoe_size", label: "Shoe size", type: "text" },
  { key: "dominant_foot", label: "Dominant foot", type: "text" },
  { key: "wingspan_in", label: "Wingspan", suffix: "in" },
  { key: "standing_reach_in", label: "Standing reach", suffix: "in" },
  { key: "body_fat_pct", label: "Body fat", suffix: "%" },
];

const TESTING: FieldDef[] = [
  { key: "vertical_in", label: "Vertical jump", suffix: "in" },
  { key: "broad_jump_in", label: "Broad jump", suffix: "in" },
  { key: "sprint_20m_sec", label: "20m sprint", suffix: "sec" },
  { key: "lane_agility_sec", label: "Lane agility", suffix: "sec" },
  { key: "shuttle_sec", label: "Shuttle run", suffix: "sec" },
  { key: "max_pullups", label: "Max pull-ups" },
  { key: "max_pushups", label: "Max push-ups" },
  { key: "grip_strength_lb", label: "Grip strength", suffix: "lb" },
];

const GOALS: FieldDef[] = [
  { key: "goal_weight_lb", label: "Goal weight", suffix: "lb" },
  { key: "goal_bench_lb", label: "Goal bench", suffix: "lb" },
  { key: "goal_squat_lb", label: "Goal squat", suffix: "lb" },
  { key: "goal_deadlift_lb", label: "Goal deadlift", suffix: "lb" },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Partial<AthleteProfile>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!DEMO_USER_ID) return;
    getProfile(DEMO_USER_ID)
      .then(setProfile)
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof AthleteProfile, value: string, isNumber: boolean) {
    setProfile((prev) => ({ ...prev, [key]: isNumber ? (value === "" ? null : Number(value)) : value }));
  }

  async function onSave() {
    setPending(true);
    setStatus(null);
    try {
      await saveProfile(DEMO_USER_ID, profile);
      setStatus({ type: "success", text: "Profile saved." });
    } catch (err) {
      setStatus({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setPending(false);
    }
  }

  function renderSection(title: string, fields: FieldDef[]) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim mb-4">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {fields.map((f) => {
            const isNumber = f.type !== "text";
            const value = profile[f.key];
            return (
              <div key={f.key}>
                <label className="text-xs tracking-wide text-fg-dim block mb-1">
                  {f.label}
                  {f.suffix ? ` (${f.suffix})` : ""}
                </label>
                <input
                  type={isNumber ? "number" : "text"}
                  value={value === null || value === undefined ? "" : value}
                  onChange={(e) => update(f.key, e.target.value, isNumber)}
                  className={inputClass}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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
<PageHeader title="Athlete profile" />

      {loading ? (
        <p className="text-sm text-fg-dim">Loading…</p>
      ) : (
        <div className="space-y-6">
          {renderSection("Measurements", MEASUREMENTS)}
          {renderSection("Athletic testing", TESTING)}
          {renderSection("Goals", GOALS)}
          <div className="flex items-center gap-4">
            <button
              onClick={onSave}
              disabled={pending}
              className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
            >
              {pending ? "Saving…" : "Save profile"}
            </button>
            {status && (
              <p className={status.type === "success" ? "text-accent text-sm" : "text-warn text-sm"}>
                {status.text}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
