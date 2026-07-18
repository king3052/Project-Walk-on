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
