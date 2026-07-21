"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  parseQuickLog,
  logStrengthSession,
  logShootingSession,
  logNutrition,
  logRecovery,
  logConditioning,
  logBodyweight,
  type QuickLogResult,
} from "@/lib/api";

const today = () => new Date().toISOString().slice(0, 10);

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

const LABELS: Record<string, string> = {
  strength: "Strength",
  shooting: "Shooting",
  nutrition: "Nutrition",
  recovery: "Recovery",
  conditioning: "Conditioning",
  bodyweight: "Bodyweight",
};

export function QuickLogForm({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const [text, setText] = useState("");
  const [date, setDate] = useState(today());
  const [result, setResult] = useState<QuickLogResult | null>(null);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onParse(e: React.FormEvent) {
    e.preventDefault();
    setParsing(true);
    setResult(null);
    try {
      const parsed = await parseQuickLog(text);
      setResult(parsed);
      setFields(parsed.fields);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't parse that.", "error");
    } finally {
      setParsing(false);
    }
  }

  function updateField(key: string, value: string) {
    const numeric = Number(value);
    setFields((prev) => ({ ...prev, [key]: value !== "" && !isNaN(numeric) ? numeric : value }));
  }

  async function onSave() {
    if (!result) return;
    setSaving(true);
    try {
      const f = fields;
      switch (result.log_type) {
        case "strength":
          await logStrengthSession(
            userId,
            date,
            [
              {
                exercise: String(f.exercise ?? ""),
                sets: Number(f.sets ?? 0),
                reps: Number(f.reps ?? 0),
                weight_lb: Number(f.weight_lb ?? 0),
              },
            ],
            undefined,
            f.duration_min ? Number(f.duration_min) : undefined,
            f.rpe ? Number(f.rpe) : undefined
          );
          break;
        case "shooting":
          await logShootingSession(
            userId,
            date,
            String(f.shot_type ?? ""),
            Number(f.attempts ?? 0),
            Number(f.makes ?? 0)
          );
          break;
        case "nutrition":
          await logNutrition(userId, date, {
            calories: f.calories ? Number(f.calories) : undefined,
            protein_g: f.protein_g ? Number(f.protein_g) : undefined,
            carbs_g: f.carbs_g ? Number(f.carbs_g) : undefined,
            fat_g: f.fat_g ? Number(f.fat_g) : undefined,
            water_l: f.water_l ? Number(f.water_l) : undefined,
          });
          break;
        case "recovery":
          await logRecovery(userId, date, {
            sleep_hours: f.sleep_hours ? Number(f.sleep_hours) : undefined,
            energy: f.energy ? Number(f.energy) : undefined,
            stress: f.stress ? Number(f.stress) : undefined,
            soreness: f.soreness ? Number(f.soreness) : undefined,
          });
          break;
        case "conditioning":
          await logConditioning(userId, date, String(f.activity ?? ""), {
            distance_m: f.distance_m ? Number(f.distance_m) : undefined,
            duration_sec: f.duration_sec ? Number(f.duration_sec) : undefined,
            rpe: f.rpe ? Number(f.rpe) : undefined,
          });
          break;
        case "bodyweight":
          await logBodyweight(userId, date, Number(f.weight_lb ?? 0));
          break;
        default:
          showToast("Not sure how to log that — try rephrasing.", "error");
          setSaving(false);
          return;
      }
      showToast(result.summary, "success");
      setText("");
      setResult(null);
      setFields({});
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <form onSubmit={onParse} className="space-y-3">
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs tracking-wide text-fg-dim block mb-1">Describe what you did</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Squatted 225 for 5, felt like an 8 out of 10…"
            className={inputClass}
            rows={3}
            required
          />
        </div>
        <button
          type="submit"
          disabled={parsing || !text.trim()}
          className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
        >
          {parsing ? "Parsing…" : "Parse"}
        </button>
      </form>

      {result && (
        <div className="rounded-lg border border-surface-border bg-surface-panel p-4 space-y-3">
          <p className="text-xs text-fg-dim">
            Detected: <span className="text-accent">{LABELS[result.log_type] || result.log_type}</span>
          </p>
          <p className="text-sm text-fg">{result.summary}</p>

          {result.log_type !== "unknown" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(fields).map(([key, value]) => (
                  <div key={key}>
                    <label className="text-xs text-fg-dim block mb-1">{key.replace(/_/g, " ")}</label>
                    <input
                      type="text"
                      value={value === null || value === undefined ? "" : String(value)}
                      onChange={(e) => updateField(key, e.target.value)}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={onSave}
                disabled={saving}
                className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors"
              >
                {saving ? "Saving…" : "Looks right — save it"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
