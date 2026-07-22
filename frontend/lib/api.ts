import { supabase } from "./supabaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const auth = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function post(path: string, body: unknown) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}

// ---------- Dashboard ----------
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

export function getDashboard(userId: string): Promise<DashboardData> {
  return apiFetch(`/dashboard/${userId}`);
}

// ---------- Training / Strength ----------
export type StrengthSetInput = { exercise: string; sets: number; reps: number; weight_lb: number };

export function logStrengthSession(
  userId: string,
  date: string,
  strengthLogs: StrengthSetInput[],
  notes?: string,
  durationMin?: number,
  rpe?: number
) {
  return post("/training-sessions/", {
    user_id: userId,
    date,
    type: "STRENGTH",
    notes: notes || null,
    duration_min: durationMin || null,
    rpe: rpe || null,
    strength_logs: strengthLogs,
  });
}

export type StrengthLogEntry = {
  id: string;
  session_id: string;
  exercise: string;
  sets: number;
  reps: number;
  weight_lb: number;
  estimated_1rm: number | null;
  is_pr: number;
};

export type TrainingSessionEntry = {
  id: string;
  user_id: string;
  date: string;
  type: string;
  duration_min: number | null;
  rpe: number | null;
  notes: string | null;
  strength_logs: StrengthLogEntry[];
};

export function getTrainingSessions(userId: string, days = 30): Promise<TrainingSessionEntry[]> {
  return apiFetch(`/training-sessions/user/${userId}?days=${days}`);
}

export function updateStrengthLog(id: string, data: Partial<StrengthLogEntry>) {
  return apiFetch(`/training-sessions/strength-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteStrengthLog(id: string) {
  return apiFetch(`/training-sessions/strength-logs/${id}`, { method: "DELETE" });
}

export function deleteTrainingSession(id: string) {
  return apiFetch(`/training-sessions/${id}`, { method: "DELETE" });
}

// ---------- Shooting ----------
export function logShootingSession(
  userId: string,
  date: string,
  shotType: string,
  attempts: number,
  makes: number,
  location?: string
) {
  return post("/shooting-logs/", { user_id: userId, date, shot_type: shotType, attempts, makes, location: location || null });
}

export type ShootingLogEntry = {
  id: string;
  user_id: string;
  date: string;
  shot_type: string;
  attempts: number;
  makes: number;
  location: string | null;
  percentage: number;
};

export function getShootingLogs(userId: string, days = 30): Promise<ShootingLogEntry[]> {
  return apiFetch(`/shooting-logs/user/${userId}?days=${days}`);
}

export function updateShootingLog(id: string, data: Partial<ShootingLogEntry>) {
  return apiFetch(`/shooting-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteShootingLog(id: string) {
  return apiFetch(`/shooting-logs/${id}`, { method: "DELETE" });
}

// ---------- Nutrition ----------
export function logNutrition(
  userId: string,
  date: string,
  data: { calories?: number; protein_g?: number; carbs_g?: number; fat_g?: number; water_l?: number }
) {
  return post("/nutrition-logs/", { user_id: userId, date, ...data });
}

export type NutritionLogEntry = {
  id: string;
  user_id: string;
  date: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_l: number | null;
};

export function getNutritionLogs(userId: string, days = 30): Promise<NutritionLogEntry[]> {
  return apiFetch(`/nutrition-logs/user/${userId}?days=${days}`);
}

export function updateNutritionLog(id: string, data: Partial<NutritionLogEntry>) {
  return apiFetch(`/nutrition-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteNutritionLog(id: string) {
  return apiFetch(`/nutrition-logs/${id}`, { method: "DELETE" });
}

// ---------- Recovery ----------
export function logRecovery(
  userId: string,
  date: string,
  data: { sleep_hours?: number; energy?: number; stress?: number; soreness?: number }
) {
  return post("/recovery-logs/", { user_id: userId, date, ...data });
}

export type RecoveryLogEntry = {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number | null;
  energy: number | null;
  stress: number | null;
  soreness: number | null;
};

export function getRecoveryLogs(userId: string, days = 30): Promise<RecoveryLogEntry[]> {
  return apiFetch(`/recovery-logs/user/${userId}?days=${days}`);
}

export function updateRecoveryLog(id: string, data: Partial<RecoveryLogEntry>) {
  return apiFetch(`/recovery-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteRecoveryLog(id: string) {
  return apiFetch(`/recovery-logs/${id}`, { method: "DELETE" });
}

// ---------- Bodyweight ----------
export function logBodyweight(userId: string, date: string, weightLb: number) {
  return post("/bodyweight-logs/", { user_id: userId, date, weight_lb: weightLb });
}

export type BodyweightLogEntry = { id: string; user_id: string; date: string; weight_lb: number };

export function getBodyweightLogs(userId: string, days = 30): Promise<BodyweightLogEntry[]> {
  return apiFetch(`/bodyweight-logs/user/${userId}?days=${days}`);
}

export function updateBodyweightLog(id: string, data: Partial<BodyweightLogEntry>) {
  return apiFetch(`/bodyweight-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteBodyweightLog(id: string) {
  return apiFetch(`/bodyweight-logs/${id}`, { method: "DELETE" });
}

// ---------- Weekly Review ----------
export function logWeeklyReview(
  userId: string,
  weekStart: string,
  data: { wins?: string; weakness?: string; next_focus?: string }
) {
  return post("/weekly-reviews/", { user_id: userId, week_start: weekStart, ...data });
}

export type WeeklyReview = {
  id: string; user_id: string; week_start: string;
  wins: string | null; weakness: string | null; next_focus: string | null; created_at: string;
};

export function getWeeklyReviews(userId: string): Promise<WeeklyReview[]> {
  return apiFetch(`/weekly-reviews/user/${userId}`);
}

// ---------- Analytics ----------
export type AnalyticsData = {
  weight: { date: string; weight_lb: number }[];
  strength: { date: string; exercise: string; estimated_1rm: number }[];
  shooting: { date: string; shot_type: string; attempts: number; makes: number }[];
  active_dates: string[];
};

export function getAnalytics(userId: string, days = 90): Promise<AnalyticsData> {
  return apiFetch(`/analytics/${userId}?days=${days}`);
}

// ---------- Profile / User ----------
export type AthleteProfile = {
  id: string; user_id: string;
  vertical_in: number | null; broad_jump_in: number | null; wingspan_in: number | null;
  standing_reach_in: number | null; body_fat_pct: number | null; shoe_size: string | null;
  dominant_foot: string | null; age: number | null; sprint_20m_sec: number | null;
  lane_agility_sec: number | null; shuttle_sec: number | null; max_pullups: number | null;
  max_pushups: number | null; grip_strength_lb: number | null; goal_weight_lb: number | null;
  goal_bench_lb: number | null; goal_squat_lb: number | null; goal_deadlift_lb: number | null;
};

export type UserRecord = {
  id: string; email: string; name: string; height_in: number | null; weight_lb: number | null;
  position: string | null; dominant_hand: string | null; sport: string | null; onboarding_complete: boolean; created_at: string;
};

export function getUser(userId: string): Promise<UserRecord> {
  return apiFetch(`/users/${userId}`);
}

export function getMe(): Promise<UserRecord> {
  return apiFetch(`/users/me`);
}

export type OnboardingData = {
  sport?: string;
  height_in?: number;
  weight_lb?: number;
  position?: string;
  dominant_hand?: string;
  dominant_foot?: string;
  age?: number;
  shoe_size?: string;
  experience_level?: string;
  wingspan_in?: number;
  standing_reach_in?: number;
  body_fat_pct?: number;
  vertical_in?: number;
  broad_jump_in?: number;
  sprint_20m_sec?: number;
  lane_agility_sec?: number;
  shuttle_sec?: number;
  max_pullups?: number;
  max_pushups?: number;
  grip_strength_lb?: number;
  goal_weight_lb?: number;
  goal_bench_lb?: number;
  goal_squat_lb?: number;
  goal_deadlift_lb?: number;
  training_days_per_week?: number;
  weight_strength?: number;
  weight_basketball?: number;
  weight_recovery?: number;
  weight_nutrition?: number;
  weight_consistency?: number;
  injury_body_part?: string;
  injury_severity?: number;
  injury_description?: string;
};

export function submitOnboarding(data: OnboardingData): Promise<UserRecord> {
  return apiFetch(`/users/onboard`, { method: "POST", body: JSON.stringify(data) });
}

export function getProfile(userId: string): Promise<AthleteProfile> {
  return apiFetch(`/users/${userId}/profile`);
}

export function saveProfile(userId: string, data: Partial<AthleteProfile>) {
  return apiFetch(`/users/${userId}/profile`, { method: "PUT", body: JSON.stringify(data) });
}

// ---------- Conditioning ----------
export function logConditioning(
  userId: string,
  date: string,
  activity: string,
  data: { distance_m?: number; duration_sec?: number; rpe?: number; notes?: string }
) {
  return post("/conditioning-logs/", { user_id: userId, date, activity, ...data });
}

export type ConditioningLogEntry = {
  id: string;
  user_id: string;
  date: string;
  activity: string;
  distance_m: number | null;
  duration_sec: number | null;
  rpe: number | null;
  notes: string | null;
};

export function getConditioningLogs(userId: string, days = 30): Promise<ConditioningLogEntry[]> {
  return apiFetch(`/conditioning-logs/user/${userId}?days=${days}`);
}

export function updateConditioningLog(id: string, data: Partial<ConditioningLogEntry>) {
  return apiFetch(`/conditioning-logs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteConditioningLog(id: string) {
  return apiFetch(`/conditioning-logs/${id}`, { method: "DELETE" });
}

// ---------- Journal ----------
export function logJournalEntry(
  userId: string,
  date: string,
  data: { went_well?: string; mistakes?: string; confidence?: number; focus?: string }
) {
  return post("/journal-entries/", { user_id: userId, date, ...data });
}

export type JournalEntry = {
  id: string; user_id: string; date: string; went_well: string | null;
  mistakes: string | null; confidence: number | null; focus: string | null; created_at: string;
};

export function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  return apiFetch(`/journal-entries/user/${userId}`);
}

// ---------- Goals ----------
export type Goal = {
  id: string; user_id: string; title: string; category: string;
  target: string | null; deadline: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED" | "MISSED";
};

export function getGoals(userId: string): Promise<Goal[]> {
  return apiFetch(`/goals/user/${userId}`);
}

export function createGoal(
  userId: string,
  data: { title: string; category: string; target?: string; deadline?: string }
) {
  return post("/goals/", { user_id: userId, ...data });
}

export function updateGoalStatus(goalId: string, status: Goal["status"]) {
  return apiFetch(`/goals/${goalId}/status?status=${status}`, { method: "PATCH" });
}

// ---------- Film Room ----------
export type FilmTag = { id: string; film_session_id: string; timestamp_sec: number; tag_type: string; note: string | null };
export type FilmSession = {
  id: string; user_id: string; date: string; title: string; video_url: string; notes: string | null; tags: FilmTag[];
};

export function getFilmSessions(userId: string): Promise<FilmSession[]> {
  return apiFetch(`/film-sessions/user/${userId}`);
}

export function createFilmSession(userId: string, date: string, title: string, videoUrl: string, notes?: string) {
  return post("/film-sessions/", { user_id: userId, date, title, video_url: videoUrl, notes: notes || null });
}

export function addFilmTag(sessionId: string, timestampSec: number, tagType: string, note?: string) {
  return post(`/film-sessions/${sessionId}/tags`, { timestamp_sec: timestampSec, tag_type: tagType, note: note || null });
}

// ---------- AI Coach ----------
export type AICoachSummary = { id: string; user_id: string; week_start: string; summary_text: string; created_at: string };

export function getAICoachSummaries(userId: string): Promise<AICoachSummary[]> {
  return apiFetch(`/ai-coach/user/${userId}`);
}

export function generateAICoachSummary(userId: string, weekStart: string): Promise<AICoachSummary> {
  return apiFetch(`/ai-coach/${userId}/generate?week_start=${weekStart}`, { method: "POST" });
}

// ---------- Achievements ----------
export type Achievement = {
  key: string; name: string; description: string; earned: boolean;
  progress_current: number; progress_target: number;
};

export function getAchievements(userId: string): Promise<Achievement[]> {
  return apiFetch(`/achievements/${userId}`);
}

// ---------- Scouting Report ----------
export type ScoutingReport = {
  id: string; user_id: string; report_month: string; strengths: string | null;
  needs_improvement: string | null; overall_grade: string | null; next_priority: string | null; created_at: string;
};

export function getScoutingReports(userId: string): Promise<ScoutingReport[]> {
  return apiFetch(`/scouting-reports/user/${userId}`);
}

export function generateScoutingReport(userId: string): Promise<ScoutingReport> {
  return apiFetch(`/scouting-reports/${userId}/generate`, { method: "POST" });
}

// ---------- Scheduled Workouts (calendar) ----------
export type ScheduledWorkout = {
  id: string; user_id: string; date: string; workout_type: string;
  title: string; notes: string | null; completed: boolean;
};

export function getScheduledWorkouts(userId: string, start: string, end: string): Promise<ScheduledWorkout[]> {
  return apiFetch(`/scheduled-workouts/user/${userId}?start=${start}&end=${end}`);
}

export function createScheduledWorkout(userId: string, date: string, workoutType: string, title: string, notes?: string) {
  return post("/scheduled-workouts/", { user_id: userId, date, workout_type: workoutType, title, notes: notes || null });
}

export function toggleScheduledWorkoutComplete(id: string) {
  return apiFetch(`/scheduled-workouts/${id}/complete`, { method: "PATCH" });
}

export function deleteScheduledWorkout(id: string) {
  return apiFetch(`/scheduled-workouts/${id}`, { method: "DELETE" });
}

export function seedWeekFromTemplate(weekStart: string): Promise<{ created: number; sport: string }> {
  return apiFetch(`/scheduled-workouts/seed-week?week_start=${weekStart}`, { method: "POST" });
}

// ---------- Weekly Template (editable) ----------
export type TemplateItem = { id: string; user_id: string; weekday: string; category: string; task: string };

export function getTemplateItems(): Promise<TemplateItem[]> {
  return apiFetch(`/template/items`);
}

export function createTemplateItem(weekday: string, category: string, task: string): Promise<TemplateItem> {
  return post("/template/items", { weekday, category, task });
}

export function updateTemplateItem(id: string, data: Partial<Omit<TemplateItem, "id" | "user_id">>) {
  return apiFetch(`/template/items/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function deleteTemplateItem(id: string) {
  return apiFetch(`/template/items/${id}`, { method: "DELETE" });
}

export function resetTemplate(): Promise<TemplateItem[]> {
  return apiFetch(`/template/reset`, { method: "POST" });
}

// ---------- Quick Log (AI parsing) ----------
export type QuickLogResult = { log_type: string; summary: string; fields: Record<string, unknown> };

export function parseQuickLog(text: string): Promise<QuickLogResult> {
  return post("/quick-log/parse", { text });
}

// ---------- AI Training Planner ----------
export type TodayPlan = { suggestion: string; context: string };

export function getTodayPlan(): Promise<TodayPlan> {
  return apiFetch(`/planner/today`);
}

// ---------- Film pattern analysis ----------
export function analyzeFilmPatterns(): Promise<{ analysis: string }> {
  return apiFetch(`/film-sessions/analyze`);
}

// ---------- Ask your data ----------
export function askQuestion(question: string): Promise<{ answer: string }> {
  return post("/ask/", { question });
}

// ---------- Push Notifications ----------
export function subscribePush(sub: { endpoint: string; p256dh: string; auth: string }) {
  return post("/notifications/subscribe", sub);
}

export function unsubscribePush(sub: { endpoint: string; p256dh: string; auth: string }) {
  return post("/notifications/unsubscribe", sub);
}

// ---------- Learning Center ----------
export type LearningResource = {
  category: string;
  title: string;
  description: string;
  source: string;
  url: string;
};

export function getLearningResources(): Promise<LearningResource[]> {
  return apiFetch(`/learning/resources`);
}

export type LearningPick = { category: string; reason: string };
export type LearningRecommendation = { picks: LearningPick[]; note?: string };

export function getRecommendedLearning(): Promise<LearningRecommendation> {
  return apiFetch(`/learning/recommended`);
}

// ---------- Sports Science Lab ----------
export type SportsScienceData = {
  daily_load: { date: string; load: number }[];
  acute_load: number;
  chronic_load: number;
  acwr: number | null;
  readiness_score: number;
  readiness_label: string;
  readiness_note: string;
};

export function getSportsScience(userId: string): Promise<SportsScienceData> {
  return apiFetch(`/sports-science/${userId}`);
}

// ---------- Injuries ----------
export type Injury = {
  id: string;
  user_id: string;
  date_reported: string;
  body_part: string;
  severity: number;
  description: string | null;
  status: "ACTIVE" | "RECOVERING" | "RESOLVED";
  rehab_notes: string | null;
  return_to_play_date: string | null;
  created_at: string;
};

export function getInjuries(userId: string): Promise<Injury[]> {
  return apiFetch(`/injuries/user/${userId}`);
}

export function createInjury(
  userId: string,
  dateReported: string,
  bodyPart: string,
  severity: number,
  description?: string
) {
  return post("/injuries/", {
    user_id: userId,
    date_reported: dateReported,
    body_part: bodyPart,
    severity,
    description: description || null,
  });
}

export function updateInjury(
  id: string,
  data: { status?: string; severity?: number; rehab_notes?: string; return_to_play_date?: string }
) {
  return apiFetch(`/injuries/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// ---------- Settings ----------
export type ScoreWeights = {
  weight_strength: number;
  weight_basketball: number;
  weight_recovery: number;
  weight_nutrition: number;
  weight_consistency: number;
};

export function getSettings(): Promise<ScoreWeights & { id: string; user_id: string }> {
  return apiFetch(`/settings/me`);
}

export function saveSettings(data: ScoreWeights) {
  return apiFetch(`/settings/me`, { method: "PUT", body: JSON.stringify(data) });
}

export function updateAccount(data: { name?: string; sport?: string }) {
  return apiFetch(`/settings/account`, { method: "PATCH", body: JSON.stringify(data) });
}

export function clearAllData() {
  return apiFetch(`/settings/data`, { method: "DELETE" });
}
