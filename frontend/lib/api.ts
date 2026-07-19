const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type DashboardData = {
  athlete_score: number;
  score_breakdown: Record<string, number>;
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

export type AthleteProfile = {
  id: string;
  user_id: string;
  vertical_in: number | null;
  broad_jump_in: number | null;
  wingspan_in: number | null;
  standing_reach_in: number | null;
  body_fat_pct: number | null;
  shoe_size: string | null;
  dominant_foot: string | null;
  age: number | null;
  sprint_20m_sec: number | null;
  lane_agility_sec: number | null;
  shuttle_sec: number | null;
  max_pullups: number | null;
  max_pushups: number | null;
  grip_strength_lb: number | null;
  goal_weight_lb: number | null;
  goal_bench_lb: number | null;
  goal_squat_lb: number | null;
  goal_deadlift_lb: number | null;
};

export async function getProfile(userId: string): Promise<AthleteProfile> {
  const res = await fetch(`${API_BASE}/users/${userId}/profile`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`);
  return res.json();
}

export function saveProfile(userId: string, data: Partial<AthleteProfile>) {
  return fetch(`${API_BASE}/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`Profile save failed: ${res.status}`);
    return res.json();
  });
}

export function logConditioning(
  userId: string,
  date: string,
  activity: string,
  data: { distance_m?: number; duration_sec?: number; notes?: string }
) {
  return post("/conditioning-logs/", { user_id: userId, date, activity, ...data });
}

export function logJournalEntry(
  userId: string,
  date: string,
  data: { went_well?: string; mistakes?: string; confidence?: number; focus?: string }
) {
  return post("/journal-entries/", { user_id: userId, date, ...data });
}

export type JournalEntry = {
  id: string;
  user_id: string;
  date: string;
  went_well: string | null;
  mistakes: string | null;
  confidence: number | null;
  focus: string | null;
  created_at: string;
};

export async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  const res = await fetch(`${API_BASE}/journal-entries/user/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Journal fetch failed: ${res.status}`);
  return res.json();
}

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target: string | null;
  deadline: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED" | "MISSED";
};

export async function getGoals(userId: string): Promise<Goal[]> {
  const res = await fetch(`${API_BASE}/goals/user/${userId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Goals fetch failed: ${res.status}`);
  return res.json();
}

export function createGoal(
  userId: string,
  data: { title: string; category: string; target?: string; deadline?: string }
) {
  return post("/goals/", { user_id: userId, ...data });
}

export function updateGoalStatus(goalId: string, status: Goal["status"]) {
  return fetch(`${API_BASE}/goals/${goalId}/status?status=${status}`, { method: "PATCH" }).then(
    async (res) => {
      if (!res.ok) throw new Error(`Goal update failed: ${res.status}`);
      return res.json();
    }
  );
}
