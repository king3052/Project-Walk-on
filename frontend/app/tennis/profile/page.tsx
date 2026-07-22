"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { TennisNav } from "@/components/TennisNav";
import { getTennisProfile, saveTennisProfile, type TennisProfile } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

export default function TennisProfilePage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Partial<TennisProfile>>({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    getTennisProfile()
      .then(setProfile)
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof TennisProfile>(key: K, value: TennisProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    setPending(true);
    try {
      await saveTennisProfile(profile);
      showToast("Saved.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <TennisNav />
      <PageHeader title="Tennis profile" description="Playing style and equipment — separate from your general athlete profile." />

      {loading ? (
        <p className="text-sm text-fg-dim">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Playing style</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-fg-dim block mb-1">Backhand</label>
                <select
                  value={profile.backhand_style || ""}
                  onChange={(e) => set("backhand_style", e.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  <option>One-handed</option>
                  <option>Two-handed</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-fg-dim block mb-1">Preferred surface</label>
                <select
                  value={profile.preferred_surface || ""}
                  onChange={(e) => set("preferred_surface", e.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  <option>Hard</option>
                  <option>Clay</option>
                  <option>Grass</option>
                  <option>Indoor</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Equipment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-fg-dim block mb-1">Racquet model</label>
                <input
                  type="text"
                  value={profile.racquet_model || ""}
                  onChange={(e) => set("racquet_model", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-fg-dim block mb-1">String type</label>
                <input
                  type="text"
                  value={profile.string_type || ""}
                  onChange={(e) => set("string_type", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-fg-dim block mb-1">String tension (lb)</label>
                <input
                  type="number"
                  onFocus={(e) => e.target.select()}
                  value={profile.string_tension_lb ?? ""}
                  onChange={(e) => set("string_tension_lb", Number(e.target.value))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-fg-dim block mb-1">Grip size</label>
                <input
                  type="text"
                  value={profile.grip_size || ""}
                  onChange={(e) => set("grip_size", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-fg-dim block mb-1">Shoe model</label>
                <input
                  type="text"
                  value={profile.shoe_model || ""}
                  onChange={(e) => set("shoe_model", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={pending}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </main>
  );
}
