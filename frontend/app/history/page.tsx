"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import {
  getTrainingSessions,
  updateStrengthLog,
  deleteStrengthLog,
  deleteTrainingSession,
  getShootingLogs,
  updateShootingLog,
  deleteShootingLog,
  getNutritionLogs,
  updateNutritionLog,
  deleteNutritionLog,
  getRecoveryLogs,
  updateRecoveryLog,
  deleteRecoveryLog,
  getConditioningLogs,
  updateConditioningLog,
  deleteConditioningLog,
  getBodyweightLogs,
  updateBodyweightLog,
  deleteBodyweightLog,
} from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-2 py-1.5 text-sm text-fg focus:outline-none focus:border-accent";

type Entry = {
  key: string;
  type: "Strength" | "Shooting" | "Nutrition" | "Recovery" | "Conditioning" | "Bodyweight";
  date: string;
  summary: string;
  fields: Record<string, number | string | boolean>;
};

export default function HistoryPage() {
  const { userId } = useAuth();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number | string | boolean>>({});

  function load() {
    if (!userId) return;
    Promise.all([
      getTrainingSessions(userId),
      getShootingLogs(userId),
      getNutritionLogs(userId),
      getRecoveryLogs(userId),
      getConditioningLogs(userId),
      getBodyweightLogs(userId),
    ]).then(([sessions, shooting, nutrition, recovery, conditioning, bodyweight]) => {
      const list: Entry[] = [];

      sessions.forEach((s) => {
        s.strength_logs.forEach((sl) => {
          list.push({
            key: `strength-${sl.id}`,
            type: "Strength",
            date: s.date,
            summary: `${sl.exercise} — ${sl.sets}x${sl.reps} @ ${sl.weight_lb}lb`,
            fields: { id: sl.id, exercise: sl.exercise, sets: sl.sets, reps: sl.reps, weight_lb: sl.weight_lb },
          });
        });
        if (s.strength_logs.length === 0) {
          list.push({
            key: `session-${s.id}`,
            type: "Strength",
            date: s.date,
            summary: `${s.type} session${s.duration_min ? ` — ${s.duration_min} min` : ""}`,
            fields: { id: s.id, sessionOnly: true },
          });
        }
      });

      shooting.forEach((s) =>
        list.push({
          key: `shooting-${s.id}`,
          type: "Shooting",
          date: s.date,
          summary: `${s.shot_type} — ${s.makes}/${s.attempts} (${s.percentage}%)`,
          fields: { id: s.id, shot_type: s.shot_type, attempts: s.attempts, makes: s.makes },
        })
      );

      nutrition.forEach((n) =>
        list.push({
          key: `nutrition-${n.id}`,
          type: "Nutrition",
          date: n.date,
          summary: `${n.calories ?? "—"} kcal, ${n.protein_g ?? "—"}g protein`,
          fields: {
            id: n.id,
            calories: n.calories ?? "",
            protein_g: n.protein_g ?? "",
            carbs_g: n.carbs_g ?? "",
            fat_g: n.fat_g ?? "",
            water_l: n.water_l ?? "",
          },
        })
      );

      recovery.forEach((r) =>
        list.push({
          key: `recovery-${r.id}`,
          type: "Recovery",
          date: r.date,
          summary: `Sleep ${r.sleep_hours ?? "—"}h, energy ${r.energy ?? "—"}/10`,
          fields: {
            id: r.id,
            sleep_hours: r.sleep_hours ?? "",
            energy: r.energy ?? "",
            stress: r.stress ?? "",
            soreness: r.soreness ?? "",
          },
        })
      );

      conditioning.forEach((c) =>
        list.push({
          key: `conditioning-${c.id}`,
          type: "Conditioning",
          date: c.date,
          summary: `${c.activity}${c.duration_sec ? ` — ${c.duration_sec}s` : ""}`,
          fields: {
            id: c.id,
            activity: c.activity,
            distance_m: c.distance_m ?? "",
            duration_sec: c.duration_sec ?? "",
            rpe: c.rpe ?? "",
          },
        })
      );

      bodyweight.forEach((b) =>
        list.push({
          key: `bodyweight-${b.id}`,
          type: "Bodyweight",
          date: b.date,
          summary: `${b.weight_lb} lb`,
          fields: { id: b.id, weight_lb: b.weight_lb },
        })
      );

      list.sort((a, b) => b.date.localeCompare(a.date));
      setEntries(list);
    });
  }

  useEffect(load, [userId]);

  function startEdit(entry: Entry) {
    setEditingKey(entry.key);
    setEditValues({ ...entry.fields });
  }

  async function saveEdit(entry: Entry) {
    const id = String(editValues.id);
    try {
      if (entry.type === "Strength") {
        if (editValues.sessionOnly) {
          showToast("This session has no individual sets to edit.", "error");
        } else {
          await updateStrengthLog(id, {
            exercise: String(editValues.exercise),
            sets: Number(editValues.sets),
            reps: Number(editValues.reps),
            weight_lb: Number(editValues.weight_lb),
          });
        }
      } else if (entry.type === "Shooting") {
        await updateShootingLog(id, {
          shot_type: String(editValues.shot_type),
          attempts: Number(editValues.attempts),
          makes: Number(editValues.makes),
        });
      } else if (entry.type === "Nutrition") {
        await updateNutritionLog(id, {
          calories: Number(editValues.calories) || undefined,
          protein_g: Number(editValues.protein_g) || undefined,
          carbs_g: Number(editValues.carbs_g) || undefined,
          fat_g: Number(editValues.fat_g) || undefined,
          water_l: Number(editValues.water_l) || undefined,
        });
      } else if (entry.type === "Recovery") {
        await updateRecoveryLog(id, {
          sleep_hours: Number(editValues.sleep_hours) || undefined,
          energy: Number(editValues.energy) || undefined,
          stress: Number(editValues.stress) || undefined,
          soreness: Number(editValues.soreness) || undefined,
        });
      } else if (entry.type === "Conditioning") {
        await updateConditioningLog(id, {
          activity: String(editValues.activity),
          distance_m: Number(editValues.distance_m) || undefined,
          duration_sec: Number(editValues.duration_sec) || undefined,
          rpe: Number(editValues.rpe) || undefined,
        });
      } else if (entry.type === "Bodyweight") {
        await updateBodyweightLog(id, { weight_lb: Number(editValues.weight_lb) });
      }
      showToast("Updated.", "success");
      setEditingKey(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  async function onDelete(entry: Entry) {
    const id = String(entry.fields.id);
    try {
      if (entry.type === "Strength") {
        if (entry.fields.sessionOnly) {
          await deleteTrainingSession(id);
        } else {
          await deleteStrengthLog(id);
        }
      } else if (entry.type === "Shooting") {
        await deleteShootingLog(id);
      } else if (entry.type === "Nutrition") {
        await deleteNutritionLog(id);
      } else if (entry.type === "Recovery") {
        await deleteRecoveryLog(id);
      } else if (entry.type === "Conditioning") {
        await deleteConditioningLog(id);
      } else if (entry.type === "Bodyweight") {
        await deleteBodyweightLog(id);
      }
      showToast("Deleted.", "success");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    }
  }

  function renderEditFields(entry: Entry) {
    const fieldKeys = Object.keys(entry.fields).filter((k) => k !== "id" && k !== "sessionOnly");
    return (
      <div className="grid grid-cols-2 gap-2 mt-2">
        {fieldKeys.map((key) => (
          <div key={key}>
            <label className="text-xs text-fg-dim block mb-0.5">{key.replace(/_/g, " ")}</label>
            <input
              type={typeof entry.fields[key] === "number" ? "number" : "text"}
              value={typeof editValues[key] === "boolean" ? "" : editValues[key] ?? ""}
              onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
              onFocus={(e) => e.target.select()}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!userId) return null;

  const grouped = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader title="Log history" description="Every entry you've logged — edit or delete anything here." />

      <div className="space-y-6">
        {entries.length === 0 && <p className="text-sm text-fg-dim">Nothing logged yet.</p>}
        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">{date}</p>
            <div className="space-y-2">
              {items.map((entry) => (
                <div key={entry.key} className="rounded-lg border border-surface-border bg-surface-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-accent">{entry.type}</p>
                      <p className="text-sm text-fg">{entry.summary}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!(entry.type === "Strength" && entry.fields.sessionOnly) && (
                        <button
                          onClick={() => (editingKey === entry.key ? setEditingKey(null) : startEdit(entry))}
                          className="text-xs text-fg-dim hover:text-accent px-3 py-2 rounded-md hover:bg-surface-panelHover transition-colors"
                        >
                          {editingKey === entry.key ? "Cancel" : "Edit"}
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(entry)}
                        className="text-xs text-fg-dim hover:text-warn px-3 py-2 rounded-md hover:bg-surface-panelHover transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {editingKey === entry.key && (
                    <>
                      {renderEditFields(entry)}
                      <button
                        onClick={() => saveEdit(entry)}
                        className="mt-3 text-xs bg-accent hover:bg-accent-dim text-accent-deep px-4 py-1.5 rounded-md transition-colors"
                      >
                        Save
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
