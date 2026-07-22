"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { submitOnboarding, type OnboardingData } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const TOTAL_STEPS = 6;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs tracking-wide text-fg-dim block mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
            onFocus={(e) => e.target.select()}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className={inputClass}
      />
    </Field>
  );
}

const PRIORITIES = [
  { key: "weight_strength", label: "Getting stronger" },
  { key: "weight_basketball", label: "Basketball skill" },
  { key: "weight_recovery", label: "Recovery & sleep" },
  { key: "weight_nutrition", label: "Nutrition" },
  { key: "weight_consistency", label: "Just showing up consistently" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — basics
  const [sport, setSport] = useState("Basketball");
  const [heightIn, setHeightIn] = useState<number>();
  const [weightLb, setWeightLb] = useState<number>();
  const [position, setPosition] = useState("");
  const [dominantHand, setDominantHand] = useState("Right");
  const [dominantFoot, setDominantFoot] = useState("Right");
  const [age, setAge] = useState<number>();
  const [shoeSize, setShoeSize] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Intermediate");

  // Step 2 — body measurements
  const [wingspanIn, setWingspanIn] = useState<number>();
  const [standingReachIn, setStandingReachIn] = useState<number>();
  const [bodyFatPct, setBodyFatPct] = useState<number>();

  // Step 3 — athletic testing
  const [verticalIn, setVerticalIn] = useState<number>();
  const [broadJumpIn, setBroadJumpIn] = useState<number>();
  const [sprint20m, setSprint20m] = useState<number>();
  const [laneAgility, setLaneAgility] = useState<number>();
  const [shuttle, setShuttle] = useState<number>();
  const [maxPullups, setMaxPullups] = useState<number>();
  const [maxPushups, setMaxPushups] = useState<number>();
  const [gripStrength, setGripStrength] = useState<number>();

  // Step 4 — goals + availability
  const [goalWeight, setGoalWeight] = useState<number>();
  const [goalBench, setGoalBench] = useState<number>();
  const [goalSquat, setGoalSquat] = useState<number>();
  const [goalDeadlift, setGoalDeadlift] = useState<number>();
  const [trainingDays, setTrainingDays] = useState<number>();

  // Step 5 — priority
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]["key"]>("weight_strength");

  // Step 6 — injury
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryBodyPart, setInjuryBodyPart] = useState("");
  const [injurySeverity, setInjurySeverity] = useState(5);
  const [injuryDescription, setInjuryDescription] = useState("");

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function onFinish() {
    setPending(true);
    setError(null);

    // Priority choice -> score weights: chosen pillar gets 40, remainder split evenly
    const weights: Record<string, number> = {
      weight_strength: 15,
      weight_basketball: 15,
      weight_recovery: 15,
      weight_nutrition: 15,
      weight_consistency: 15,
    };
    weights[priority] = 40;
    const others = PRIORITIES.map((p) => p.key).filter((k) => k !== priority);
    others.forEach((k) => (weights[k] = 15));

    const payload: OnboardingData = {
      sport,
      height_in: heightIn,
      weight_lb: weightLb,
      position: position || undefined,
      dominant_hand: dominantHand,
      dominant_foot: dominantFoot,
      age,
      shoe_size: shoeSize || undefined,
      experience_level: experienceLevel,
      wingspan_in: wingspanIn,
      standing_reach_in: standingReachIn,
      body_fat_pct: bodyFatPct,
      vertical_in: verticalIn,
      broad_jump_in: broadJumpIn,
      sprint_20m_sec: sprint20m,
      lane_agility_sec: laneAgility,
      shuttle_sec: shuttle,
      max_pullups: maxPullups,
      max_pushups: maxPushups,
      grip_strength_lb: gripStrength,
      goal_weight_lb: goalWeight,
      goal_bench_lb: goalBench,
      goal_squat_lb: goalSquat,
      goal_deadlift_lb: goalDeadlift,
      training_days_per_week: trainingDays,
      weight_strength: weights.weight_strength,
      weight_basketball: weights.weight_basketball,
      weight_recovery: weights.weight_recovery,
      weight_nutrition: weights.weight_nutrition,
      weight_consistency: weights.weight_consistency,
      injury_body_part: hasInjury ? injuryBodyPart || undefined : undefined,
      injury_severity: hasInjury ? injurySeverity : undefined,
      injury_description: hasInjury ? injuryDescription || undefined : undefined,
    };

    try {
      await submitOnboarding(payload);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Image src="/logo-mascot.png" alt="" width={64} height={54} className="mx-auto mb-3" />
          <h1 className="font-display text-3xl tracking-tight text-fg">Let&apos;s set you up</h1>
          <p className="text-xs text-fg-dim mt-2">
            Step {step} of {TOTAL_STEPS} — everything&apos;s optional and editable later in Profile or Settings.
          </p>
          <div className="flex gap-1 mt-3">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i < step ? "bg-accent" : "bg-surface-border"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Basics</h2>
            <Field label="Sport">
              <select value={sport} onChange={(e) => setSport(e.target.value)} className={inputClass}>
                <option>Basketball</option>
                <option>Tennis</option>
              </select>
            </Field>
            <NumberField label="Height (in)" value={heightIn} onChange={setHeightIn} />
            <NumberField label="Weight (lb)" value={weightLb} onChange={setWeightLb} />
            <Field label="Position">
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={sport === "Tennis" ? "Singles, Doubles…" : "Point Guard, Shooting Guard…"}
                className={inputClass}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dominant hand">
                <select value={dominantHand} onChange={(e) => setDominantHand(e.target.value)} className={inputClass}>
                  <option>Right</option>
                  <option>Left</option>
                </select>
              </Field>
              <Field label="Dominant foot">
                <select value={dominantFoot} onChange={(e) => setDominantFoot(e.target.value)} className={inputClass}>
                  <option>Right</option>
                  <option>Left</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Age" value={age} onChange={setAge} />
              <Field label="Shoe size">
                <input type="text" value={shoeSize} onChange={(e) => setShoeSize(e.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label="Experience level">
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className={inputClass}
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </Field>
            <button onClick={next} className="w-full text-sm bg-accent hover:bg-accent-dim text-accent-deep px-5 py-2.5 rounded-md transition-colors">
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Body measurements</h2>
            <p className="text-xs text-fg-dim">Skip anything you don&apos;t know off-hand.</p>
            <NumberField label="Wingspan (in)" value={wingspanIn} onChange={setWingspanIn} />
            <NumberField label="Standing reach (in)" value={standingReachIn} onChange={setStandingReachIn} />
            <NumberField label="Body fat %" value={bodyFatPct} onChange={setBodyFatPct} />
            <div className="flex gap-2">
              <button onClick={back} className="text-sm text-fg-dim hover:text-fg-muted px-4 py-2.5 transition-colors">
                ← Back
              </button>
              <button onClick={next} className="flex-1 text-sm bg-accent hover:bg-accent-dim text-accent-deep px-5 py-2.5 rounded-md transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Athletic testing</h2>
            <p className="text-xs text-fg-dim">Only fill in what you&apos;ve actually tested — no guessing.</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Vertical jump (in)" value={verticalIn} onChange={setVerticalIn} />
              <NumberField label="Broad jump (in)" value={broadJumpIn} onChange={setBroadJumpIn} />
              <NumberField label="20m sprint (sec)" value={sprint20m} onChange={setSprint20m} />
              <NumberField label="Lane agility (sec)" value={laneAgility} onChange={setLaneAgility} />
              <NumberField label="Shuttle run (sec)" value={shuttle} onChange={setShuttle} />
              <NumberField label="Grip strength (lb)" value={gripStrength} onChange={setGripStrength} />
              <NumberField label="Max pull-ups" value={maxPullups} onChange={setMaxPullups} />
              <NumberField label="Max push-ups" value={maxPushups} onChange={setMaxPushups} />
            </div>
            <div className="flex gap-2">
              <button onClick={back} className="text-sm text-fg-dim hover:text-fg-muted px-4 py-2.5 transition-colors">
                ← Back
              </button>
              <button onClick={next} className="flex-1 text-sm bg-accent hover:bg-accent-dim text-accent-deep px-5 py-2.5 rounded-md transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Goals & availability</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Goal weight (lb)" value={goalWeight} onChange={setGoalWeight} />
              <NumberField label="Goal bench (lb)" value={goalBench} onChange={setGoalBench} />
              <NumberField label="Goal squat (lb)" value={goalSquat} onChange={setGoalSquat} />
              <NumberField label="Goal deadlift (lb)" value={goalDeadlift} onChange={setGoalDeadlift} />
            </div>
            <NumberField label="Days per week you can realistically train" value={trainingDays} onChange={setTrainingDays} />
            <div className="flex gap-2">
              <button onClick={back} className="text-sm text-fg-dim hover:text-fg-muted px-4 py-2.5 transition-colors">
                ← Back
              </button>
              <button onClick={next} className="flex-1 text-sm bg-accent hover:bg-accent-dim text-accent-deep px-5 py-2.5 rounded-md transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">What matters most right now?</h2>
            <p className="text-xs text-fg-dim">
              This sets your Athlete Score weighting — fine-tune it anytime in Settings.
            </p>
            <div className="space-y-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPriority(p.key)}
                  className={`w-full text-left rounded-md border px-4 py-3 text-sm transition-colors ${
                    priority === p.key
                      ? "border-accent text-accent bg-surface-panel"
                      : "border-surface-border text-fg hover:bg-surface-panelHover"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={back} className="text-sm text-fg-dim hover:text-fg-muted px-4 py-2.5 transition-colors">
                ← Back
              </button>
              <button onClick={next} className="flex-1 text-sm bg-accent hover:bg-accent-dim text-accent-deep px-5 py-2.5 rounded-md transition-colors">
                Next
              </button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-wide text-fg-dim">Any current injury?</h2>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input type="checkbox" checked={hasInjury} onChange={(e) => setHasInjury(e.target.checked)} />
              I&apos;m currently dealing with an injury
            </label>
            {hasInjury && (
              <>
                <Field label="Body part">
                  <input
                    type="text"
                    value={injuryBodyPart}
                    onChange={(e) => setInjuryBodyPart(e.target.value)}
                    placeholder="Right ankle…"
                    className={inputClass}
                  />
                </Field>
                <Field label={`Severity (1-10): ${injurySeverity}`}>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={injurySeverity}
                    onChange={(e) => setInjurySeverity(Number(e.target.value))}
                    className="w-full accent-[#4ADE80]"
                  />
                </Field>
                <Field label="Notes (optional)">
                  <textarea
                    value={injuryDescription}
                    onChange={(e) => setInjuryDescription(e.target.value)}
                    className={inputClass}
                    rows={2}
                  />
                </Field>
              </>
            )}
            <div className="flex gap-2">
              <button onClick={back} className="text-sm text-fg-dim hover:text-fg-muted px-4 py-2.5 transition-colors">
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
