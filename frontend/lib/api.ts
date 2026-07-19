const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type DashboardData = {
  athlete_score: number;
  weight_lb: number | null;
  goal_weight_lb: number | null;
  bench_lb: number | null;
  squat_lb: number | null;
  deadlift_lb: number | null;
  shots_this_week: number;
  shooting_pct_this_week: number;
  avg_sleep_this_week: number | null;
};

export async function getDashboard(userId: string): Promise<DashboardData> {
  const res = await fetch(`${API_BASE}/dashboard/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
  return res.json();
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export type StrengthSetInput = {
  exercise: string;
  sets: number;
  reps: number;
  weight_lb: number;
};

export function logStrengthSession(
  userId: string,
  date: string,
  strengthLogs: StrengthSetInput[],
  notes?: string
) {
  return post("/training-sessions/", {
    user_id: userId,
    date,
    type: "STRENGTH",
    notes: notes || null,
    strength_logs: strengthLogs,
  });
}

export function logShootingSession(
  userId: string,
  date: string,
  shotType: string,
  attempts: number,
  makes: number,
  location?: string
) {
  return post("/shooting-logs/", {
    user_id: userId,
    date,
    shot_type: shotType,
    attempts,
    makes,
    location: location || null,
  });
}

export function logNutrition(
  userId: string,
  date: string,
  data: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; water_l?: number }
) {
  return post("/nutrition-logs/", { user_id: userId, date, ...data });
}

export function logRecovery(
  userId: string,
  date: string,
  data: { sleep_hours?: number; energy?: number; stress?: number; soreness?: number }
) {
  return post("/recovery-logs/", { user_id: userId, date, ...data });
}
