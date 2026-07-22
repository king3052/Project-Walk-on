"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  logStrengthSession,
  logShootingSession,
  logNutrition,
  logRecovery,
  logBodyweight,
  logConditioning,
  type StrengthSetInput,
} from "@/lib/api";

const today = () => new Date().toISOString().slice(0, 10);

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs tracking-wide text-fg-dim block mb-1">{children}</label>;
}

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
    >
      {pending ? "Saving…" : "Log it"}
    </button>
  );
}

export function StrengthForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [exercise, setExercise] = useState("Back Squat");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(5);
  const [weight, setWeight] = useState(185);
  const [duration, setDuration] = useState(45);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const strengthLogs: StrengthSetInput[] = [{ exercise, sets, reps, weight_lb: weight }];
      await logStrengthSession(userId, date, strengthLogs, notes, duration, rpe);
      showToast(`Logged ${exercise}: ${sets}x${reps} @ ${weight}lb.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      <div>
        <FieldLabel>Exercise</FieldLabel>
        <input
          type="text"
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          placeholder="Back Squat, Bench Press, Deadlift…"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel>Sets</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={sets}
            onChange={(e) => setSets(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Reps</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={reps}
            onChange={(e) => setReps(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Weight (lb)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Session duration (min)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>RPE (1-10, effort)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Notes (optional)</FieldLabel>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={2} />
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function ShootingForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [shotType, setShotType] = useState("Corner 3");
  const [attempts, setAttempts] = useState(100);
  const [makes, setMakes] = useState(70);
  const [location, setLocation] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await logShootingSession(userId, date, shotType, attempts, makes, location);
      const pct = attempts ? Math.round((makes / attempts) * 100) : 0;
      showToast(`Logged ${shotType}: ${makes}/${attempts} (${pct}%).`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      <div>
        <FieldLabel>Shot type</FieldLabel>
        <input
          type="text"
          value={shotType}
          onChange={(e) => setShotType(e.target.value)}
          placeholder="Corner 3, Wing 3, Pull-up, Free Throw…"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Attempts</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={attempts}
            onChange={(e) => setAttempts(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Makes</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={makes}
            onChange={(e) => setMakes(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Location (optional)</FieldLabel>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Gregory Gym, home hoop…"
          className={inputClass}
        />
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function NutritionForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [calories, setCalories] = useState(3500);
  const [protein, setProtein] = useState(180);
  const [carbs, setCarbs] = useState(400);
  const [fat, setFat] = useState(90);
  const [water, setWater] = useState(4);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await logNutrition(userId, date, {
        calories,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        water_l: water,
      });
      showToast(`Logged nutrition for ${date}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Calories</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={calories}
            onChange={(e) => setCalories(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Protein (g)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={protein}
            onChange={(e) => setProtein(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Carbs (g)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={carbs}
            onChange={(e) => setCarbs(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Fat (g)</FieldLabel>
          <input type="number"
            onFocus={(e) => e.target.select()} value={fat} onChange={(e) => setFat(Number(e.target.value))} className={inputClass} />
        </div>
      </div>
      <div>
        <FieldLabel>Water (L)</FieldLabel>
        <input
          type="number"
            onFocus={(e) => e.target.select()}
          step="0.1"
          value={water}
          onChange={(e) => setWater(Number(e.target.value))}
          className={inputClass}
        />
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function RecoveryForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [sleep, setSleep] = useState(8);
  const [energy, setEnergy] = useState(7);
  const [stress, setStress] = useState(4);
  const [soreness, setSoreness] = useState(3);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await logRecovery(userId, date, { sleep_hours: sleep, energy, stress, soreness });
      showToast(`Logged recovery for ${date}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      <div>
        <FieldLabel>Sleep (hours)</FieldLabel>
        <input
          type="number"
            onFocus={(e) => e.target.select()}
          step="0.1"
          value={sleep}
          onChange={(e) => setSleep(Number(e.target.value))}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <FieldLabel>Energy (1-10)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min={1}
            max={10}
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Stress (1-10)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min={1}
            max={10}
            value={stress}
            onChange={(e) => setStress(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Soreness (1-10)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            min={1}
            max={10}
            value={soreness}
            onChange={(e) => setSoreness(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function BodyweightForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState(160);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await logBodyweight(userId, date, weight);
      showToast(`Logged ${weight}lb for ${date}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      <div>
        <FieldLabel>Weight (lb)</FieldLabel>
        <input
          type="number"
            onFocus={(e) => e.target.select()}
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className={inputClass}
        />
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function ConditioningForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [date, setDate] = useState(today());
  const [activity, setActivity] = useState("Sprints");
  const [distance, setDistance] = useState(400);
  const [duration, setDuration] = useState(180);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await logConditioning(userId, date, activity, {
        distance_m: distance || undefined,
        duration_sec: duration || undefined,
        rpe: rpe || undefined,
        notes: notes || undefined,
      });
      showToast(`Logged ${activity} for ${date}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <FieldLabel>Date</FieldLabel>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
      </div>
      <div>
        <FieldLabel>Activity</FieldLabel>
        <input
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="Sprints, Suicides, Tempo run, Bike, Row, Jump rope…"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Distance (m)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Duration (sec)</FieldLabel>
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <FieldLabel>RPE (1-10, effort)</FieldLabel>
        <input
          type="number"
            onFocus={(e) => e.target.select()}
          min={1}
          max={10}
          value={rpe}
          onChange={(e) => setRpe(Number(e.target.value))}
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel>Notes (optional)</FieldLabel>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} rows={2} />
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}
