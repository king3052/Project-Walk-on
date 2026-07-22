"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { NotificationSettings } from "@/components/NotificationSettings";
import {
  getMe,
  updateAccount,
  getSettings,
  saveSettings,
  clearAllData,
  type ScoreWeights,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const WEIGHT_FIELDS: { key: keyof ScoreWeights; label: string }[] = [
  { key: "weight_strength", label: "Strength" },
  { key: "weight_basketball", label: "Basketball" },
  { key: "weight_recovery", label: "Recovery" },
  { key: "weight_nutrition", label: "Nutrition" },
  { key: "weight_consistency", label: "Consistency" },
];

export default function SettingsPage() {
  const { userId, signOut } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sport, setSport] = useState("Basketball");
  const [namePending, setNamePending] = useState(false);
  const [nameStatus, setNameStatus] = useState<string | null>(null);

  const [weights, setWeights] = useState<ScoreWeights>({
    weight_strength: 25,
    weight_basketball: 25,
    weight_recovery: 20,
    weight_nutrition: 15,
    weight_consistency: 15,
  });
  const [weightsPending, setWeightsPending] = useState(false);
  const [weightsStatus, setWeightsStatus] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getMe().then((u) => {
      setName(u.name);
      setEmail(u.email);
      setSport(u.sport || "Basketball");
    });
    getSettings().then(setWeights);
  }, [userId]);

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNamePending(true);
    setNameStatus(null);
    try {
      await updateAccount({ name, sport });
      setNameStatus("Saved.");
    } catch (err) {
      setNameStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setNamePending(false);
    }
  }

  async function onSaveWeights(e: React.FormEvent) {
    e.preventDefault();
    setWeightsPending(true);
    setWeightsStatus(null);
    try {
      await saveSettings(weights);
      setWeightsStatus("Saved — your athlete score will reflect this next time it's calculated.");
    } catch (err) {
      setWeightsStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setWeightsPending(false);
    }
  }

  async function onClearData() {
    setClearing(true);
    setClearError(null);
    try {
      await clearAllData();
      router.push("/onboarding");
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Something went wrong.");
      setClearing(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <PageHeader title="Settings" />

      <section className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Account</h2>
        <form onSubmit={onSaveName} className="space-y-3">
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Sport</label>
            <select value={sport} onChange={(e) => setSport(e.target.value)} className={inputClass}>
              <option>Basketball</option>
              <option>Tennis</option>
            </select>
            <p className="text-xs text-fg-dim mt-1">
              Switches your weekly template and Learning Center content to match.
            </p>
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Email</label>
            <input type="email" value={email} disabled className={`${inputClass} opacity-60`} />
            <p className="text-xs text-fg-dim mt-1">Email is managed by your login provider — not editable here.</p>
          </div>
          <button
            type="submit"
            disabled={namePending}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
          >
            {namePending ? "Saving…" : "Save name"}
          </button>
          {nameStatus && <p className="text-accent text-sm">{nameStatus}</p>}
        </form>
      </section>

      <section className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Athlete score weighting</h2>
        <p className="text-xs text-fg-dim">
          How much each pillar counts toward your overall score. Don&apos;t need to sum to 100 —
          only pillars with real data are counted, and remaining weights are rebalanced automatically.
        </p>
        <form onSubmit={onSaveWeights} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {WEIGHT_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-xs tracking-wide text-fg-dim block mb-1">
                  {f.key === "weight_basketball" ? sport : f.label}
                </label>
                <input
                  type="number"
                  value={weights[f.key]}
                  onChange={(e) => setWeights((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={weightsPending}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
          >
            {weightsPending ? "Saving…" : "Save weights"}
          </button>
          {weightsStatus && <p className="text-accent text-sm">{weightsStatus}</p>}
        </form>
      </section>

      <section className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Reminders</h2>
        <p className="text-xs text-fg-dim">
          Get a push notification if you haven&apos;t logged anything by evening.
        </p>
        <NotificationSettings />
      </section>

      <section className="rounded-lg border border-warn/40 bg-surface-panel p-5 space-y-4">
        <h2 className="text-xs uppercase tracking-wide text-warn">Danger zone</h2>
        <div>
          <p className="text-sm text-fg mb-1">Clear all logged data</p>
          <p className="text-xs text-fg-dim mb-3">
            Deletes every workout, shooting session, nutrition/recovery log, journal entry, film tag,
            review, and report. Your account, profile, and goals stay intact. This cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className={inputClass}
            />
            <button
              onClick={onClearData}
              disabled={confirmText !== "DELETE" || clearing}
              className="text-sm bg-warn/20 hover:bg-warn/30 disabled:opacity-40 text-warn px-4 py-2 rounded-md transition-colors whitespace-nowrap"
            >
              {clearing ? "Clearing…" : "Clear data"}
            </button>
          </div>
          {clearError && <p className="text-warn text-sm mt-2">{clearError}</p>}
        </div>
      </section>

      <button
        onClick={() => signOut()}
        className="text-sm text-fg-dim hover:text-warn transition-colors"
      >
        Sign out
      </button>
    </main>
  );
}
