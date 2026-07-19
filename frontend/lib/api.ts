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

export function logBodyweight(userId: string, date: string, weightLb: number) {
  return post("/bodyweight-logs/", { user_id: userId, date, weight_lb: weightLb });
}

export function logWeeklyReview(
  userId: string,
  weekStart: string,
  data: { wins?: string; weakness?: string; next_focus?: string }
) {
  return post("/weekly-reviews/", { user_id: userId, week_start: weekStart, ...data });
}

export type WeeklyReview = {
  id: string;
  user_id: string;
  week_start: string;
  wins: string | null;
  weakness: string | null;
  next_focus: string | null;
  created_at: string;
};

export async function getWeeklyReviews(userId: string): Promise<WeeklyReview[]> {
  const res = await fetch(`${API_BASE}/weekly-reviews/user/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Weekly reviews fetch failed: ${res.status}`);
  return res.json();
}

export type AnalyticsData = {
  weight: { date: string; weight_lb: number }[];
  strength: { date: string; exercise: string; estimated_1rm: number }[];
  shooting: { date: string; shot_type: string; attempts: number; makes: number }[];
  active_dates: string[];
};

export async function getAnalytics(userId: string, days = 90): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics/${userId}?days=${days}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`);
  return res.json();
}
