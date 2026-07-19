"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { submitOnboarding } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs tracking-wide text-fg-dim block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [position, setPosition] = useState("");
  const [dominantHand, setDominantHand] = useState("Right");
  const [goalWeight, setGoalWeight] = useState("");
  const [goalBench, setGoalBench] = useState("");
  const [goalSquat, setGoalSquat] = useState("");
  const [goalDeadlift, setGoalDeadlift] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish() {
    setPending(true);
    setError(null);
    try {
      await submitOnboarding({
        height_in: heightIn ? Number(heightIn) : undefined,
        weight_lb: weightLb ? Number(weightLb) : undefined,
        position: position || undefined,
        dominant_hand: dominantHand || undefined,
        goal_weight_lb: goalWeight ? Number(goalWeight) : undefined,
        goal_bench_lb: goalBench ? Number(goalBench) : undefined,
        goal_squat_lb: goalSquat ? Number(goalSquat) : undefined,
        goal_deadlift_lb: goalDeadlift ? Number(goalDeadlift) : undefined,
      });
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo-mascot.png" alt="" width={64} height={54} className="mx-auto mb-3" />
          <h1 className="font-display text-3xl tracking-tight text-fg">Let&apos;s set you up</h1>
          <p className="text-sm text-fg-dim mt-2">
            A few real numbers to start from — you can change any of this later in Profile.
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Where you're starting</h2>
            <Field label="Height (in)">
              <input type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Weight (lb)">
              <input type="number" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Position">
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Point Guard, Shooting Guard…"
                className={inputClass}
              />
            </Field>
            <Field label="Dominant hand">
              <select value={dominantHand} onChange={(e) => setDominantHand(e.target.value)} className={inputClass}>
                <option>Right</option>
                <option>Left</option>
              </select>
            </Field>
            <button
              onClick={() => setStep(2)}
              className="w-full text-sm bg-accent hover:bg-accent-dim text-accent-deep px-5 py-2.5 rounded-md transition-colors"
            >
              Next: set goals
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Where you're headed</h2>
            <p className="text-xs text-fg-dim">All optional — leave blank if you don't know yet.</p>
            <Field label="Goal weight (lb)">
              <input type="number" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Goal bench (lb)">
              <input type="number" value={goalBench} onChange={(e) => setGoalBench(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Goal squat (lb)">
              <input type="number" value={goalSquat} onChange={(e) => setGoalSquat(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Goal deadlift (lb)">
              <input type="number" value={goalDeadlift} onChange={(e) => setGoalDeadlift(e.target.value)} className={inputClass} />
            </Field>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="text-sm text-fg-dim hover:text-fg-muted px-4 py-2.5 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={onFinish}
                disabled={pending}
                className="flex-1 text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2.5 rounded-md transition-colors"
              >
                {pending ? "Saving…" : "Start training"}
              </button>
            </div>
            {error && <p className="text-warn text-sm">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
