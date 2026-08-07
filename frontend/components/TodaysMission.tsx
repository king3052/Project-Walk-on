"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import {
  getTodaysMission,
  toggleScheduledWorkoutComplete,
  completeMissionItemWithDetail,
  getNutritionLogs,
  logNutrition,
  type TodaysMission as TodaysMissionData,
  type MissionItem,
  type NutritionLogEntry,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panel border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

const SHOOTING_KEYWORDS = ["make", "shoot", "shot", "free throw", "three"];

function detailKind(item: MissionItem): "strength" | "shooting" | "film" | "nutrition" | null {
  if (item.workout_type === "Strength") return "strength";
  if (item.workout_type === "Film") return "film";
  if (item.workout_type === "Nutrition") return "nutrition";
  if (item.workout_type === "Basketball" || item.workout_type === "Tennis") {
    const lower = item.title.toLowerCase();
    if (SHOOTING_KEYWORDS.some((k) => lower.includes(k))) return "shooting";
  }
  return null;
}

function StrengthDetailForm({ item, onDone }: { item: MissionItem; onDone: () => void }) {
  const { showToast } = useToast();
  const [exercise, setExercise] = useState(item.title);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState(0);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await completeMissionItemWithDetail(item.id, {
        detail_type: "strength",
        strength: { exercise, sets, reps, weight_lb: weight },
      });
      const detail = (result as { detail?: { is_pr?: boolean } }).detail;
      showToast(detail?.is_pr ? `New PR on ${exercise}! 🎉` : "Logged.", "success");
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 pt-2">
      <input type="text" value={exercise} onChange={(e) => setExercise(e.target.value)} className={inputClass} placeholder="Exercise" />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-fg-dim block mb-0.5">Sets</label>
          <input type="number" onFocus={(e) => e.target.select()} value={sets} onChange={(e) => setSets(Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-0.5">Reps</label>
          <input type="number" onFocus={(e) => e.target.select()} value={reps} onChange={(e) => setReps(Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-fg-dim block mb-0.5">Weight (lb)</label>
          <input type="number" onFocus={(e) => e.target.select()} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className={inputClass} />
        </div>
      </div>
      <button type="submit" disabled={pending} className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors">
        {pending ? "Logging…" : "Log & complete"}
      </button>
    </form>
  );
}

function ShootingDetailForm({ item, onDone }: { item: MissionItem; onDone: () => void }) {
  const { showToast } = useToast();
  const [spots, setSpots] = useState([{ shot_type: item.title, attempts: 0, makes: 0 }]);
  const [pending, setPending] = useState(false);

  function updateSpot(i: number, field: "shot_type" | "attempts" | "makes", value: string | number) {
    setSpots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await completeMissionItemWithDetail(item.id, { detail_type: "shooting", shooting: { spots } });
      showToast("Logged.", "success");
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 pt-2">
      {spots.map((spot, i) => (
        <div key={i} className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={spot.shot_type}
            onChange={(e) => updateSpot(i, "shot_type", e.target.value)}
            placeholder="Spot (e.g. Corner 3)"
            className={inputClass}
          />
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={spot.attempts}
            onChange={(e) => updateSpot(i, "attempts", Number(e.target.value))}
            placeholder="Attempts"
            className={inputClass}
          />
          <input
            type="number"
            onFocus={(e) => e.target.select()}
            value={spot.makes}
            onChange={(e) => updateSpot(i, "makes", Number(e.target.value))}
            placeholder="Makes"
            className={inputClass}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setSpots((prev) => [...prev, { shot_type: "", attempts: 0, makes: 0 }])}
        className="text-xs text-accent hover:underline"
      >
        + Add spot
      </button>
      <div>
        <button type="submit" disabled={pending} className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors">
          {pending ? "Logging…" : "Log & complete"}
        </button>
      </div>
    </form>
  );
}

function FilmDetailForm({ item, onDone }: { item: MissionItem; onDone: () => void }) {
  const { showToast } = useToast();
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await completeMissionItemWithDetail(item.id, { detail_type: "film", film: { title, notes: notes || undefined } });
      showToast("Logged.", "success");
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 pt-2">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Player / topic" className={inputClass} />
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Takeaways…" className={inputClass} rows={2} />
      <button type="submit" disabled={pending} className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors">
        {pending ? "Logging…" : "Log & complete"}
      </button>
    </form>
  );
}

function NutritionDetailView({ onDone }: { onDone: () => void }) {
  const { userId } = useAuth();
  const { showToast } = useToast();
  const [today, setToday] = useState<NutritionLogEntry | null>(null);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [water, setWater] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getNutritionLogs(userId, 1)
      .then((logs) => setToday(logs[0] || null))
      .catch(() => setToday(null));
  }, [userId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setPending(true);
    try {
      await logNutrition(userId, new Date().toISOString().slice(0, 10), {
        calories: calories ? Number(calories) : undefined,
        protein_g: protein ? Number(protein) : undefined,
        carbs_g: carbs ? Number(carbs) : undefined,
        fat_g: fat ? Number(fat) : undefined,
        water_l: water ? Number(water) : undefined,
      });
      showToast("Nutrition logged.", "success");
      onDone();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pt-2 space-y-2">
      {today && (
        <p className="text-xs text-fg-dim">
          Logged today: {today.calories ?? "—"} cal · {today.protein_g ?? "—"}g protein · {today.carbs_g ?? "—"}g carbs ·{" "}
          {today.fat_g ?? "—"}g fat · {today.water_l ?? "—"}L water
        </p>
      )}
      <form onSubmit={onSubmit} className="grid grid-cols-3 gap-2">
        <input type="number" onFocus={(e) => e.target.select()} value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="Calories" className={inputClass} />
        <input type="number" onFocus={(e) => e.target.select()} value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="Protein (g)" className={inputClass} />
        <input type="number" onFocus={(e) => e.target.select()} value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="Carbs (g)" className={inputClass} />
        <input type="number" onFocus={(e) => e.target.select()} value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Fat (g)" className={inputClass} />
        <input type="number" onFocus={(e) => e.target.select()} value={water} onChange={(e) => setWater(e.target.value)} placeholder="Water (L)" className={inputClass} />
        <button type="submit" disabled={pending} className="text-xs bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-3 py-1.5 rounded-md transition-colors">
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

export function TodaysMission() {
  const [data, setData] = useState<TodaysMissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    getTodaysMission()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function onToggle(id: string) {
    setData((prev) =>
      prev ? { ...prev, top_5: prev.top_5.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)) } : prev
    );
    try {
      await toggleScheduledWorkoutComplete(id);
    } finally {
      load();
    }
  }

  function onDetailDone() {
    setExpandedId(null);
    load();
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-panel p-6">
        <div className="skeleton h-5 w-40 mb-3" />
        <div className="skeleton h-4 w-full mb-2" />
        <div className="skeleton h-4 w-5/6" />
      </div>
    );
  }

  if (!data || data.total_items === 0) return null;

  return (
    <div className="rounded-lg border border-accent/40 bg-surface-panel p-6 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-fg-dim">Today&apos;s Mission</p>
        <p className="text-xs text-fg-dim">
          {data.completed_count}/{data.total_items} complete
        </p>
      </div>

      {data.focus_note && <p className="text-sm text-fg leading-relaxed">{data.focus_note}</p>}

      {data.top_5.length > 0 ? (
        <div className="space-y-1 pt-1">
          {data.top_5.map((item) => {
            const kind = detailKind(item);
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-md hover:bg-surface-panelHover transition-colors px-2 py-1.5">
                <div className="flex items-center gap-2.5">
                  <input type="checkbox" checked={item.completed} onChange={() => onToggle(item.id)} className="accent-[#4ADE80] shrink-0" />
                  <button
                    type="button"
                    onClick={() => kind && setExpandedId(isExpanded ? null : item.id)}
                    className={`text-sm text-left flex-1 ${item.completed ? "text-fg-dim line-through" : "text-fg"} ${kind ? "cursor-pointer hover:text-accent" : ""}`}
                  >
                    {item.title}
                  </button>
                  <span className="text-xs text-fg-dim shrink-0">{item.workout_type}</span>
                  {kind && <span className="text-xs text-fg-dim shrink-0">{isExpanded ? "▲" : "▼"}</span>}
                </div>
                {isExpanded && kind === "strength" && <StrengthDetailForm item={item} onDone={onDetailDone} />}
                {isExpanded && kind === "shooting" && <ShootingDetailForm item={item} onDone={onDetailDone} />}
                {isExpanded && kind === "film" && <FilmDetailForm item={item} onDone={onDetailDone} />}
                {isExpanded && kind === "nutrition" && <NutritionDetailView onDone={onDetailDone} />}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-fg-dim">Everything&apos;s done for today. 🎉</p>
      )}

      {data.remaining_beyond_top_5 > 0 && (
        <p className="text-xs text-fg-dim pt-1">
          +{data.remaining_beyond_top_5} more scheduled today — check Calendar for the full list.
        </p>
      )}
    </div>
  );
}
