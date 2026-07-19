import Link from "next/link";
import { getDashboard, type DashboardData } from "@/lib/api";
import { StatCard, Section } from "@/components/StatCard";
import { Mission } from "@/components/Mission";

const MOCK: DashboardData = {
  athlete_score: 84,
  weight_lb: 159.8,
  goal_weight_lb: 185,
  bench_lb: 120,
  squat_lb: 170,
  deadlift_lb: 205,
  shots_this_week: 1200,
  shooting_pct_this_week: 68,
  avg_sleep_this_week: 7.8,
};

// TODO: replace with the logged-in user's id once auth is wired up.
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

async function loadDashboard(): Promise<DashboardData> {
  if (!DEMO_USER_ID) return MOCK;
  try {
    return await getDashboard(DEMO_USER_ID);
  } catch {
    return MOCK; // backend not up yet — keep the dashboard usable
  }
}

export default async function DashboardPage() {
  const data = await loadDashboard();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
      <header className="flex items-baseline justify-between border-b border-court-line pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-hardwood-light mb-1">
            Project
          </p>
          <h1 className="font-display text-5xl tracking-tight">Walk-On</h1>
        </div>
        <div className="text-right space-y-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-chalk-dim">Athlete Score</p>
            <p className="font-display text-6xl text-hardwood-light tabular-nums leading-none">
              {data.athlete_score}
              <span className="text-2xl text-chalk-dim">/100</span>
            </p>
          </div>
          <Link
            href="/log"
            className="inline-block font-display uppercase tracking-widest text-xs bg-hardwood hover:bg-hardwood-light text-court-bg px-4 py-1.5 rounded transition-colors"
          >
            Log Today
          </Link>
        </div>
      </header>

      <Section title="Body">
        <StatCard
          label="Weight"
          value={data.weight_lb ? `${data.weight_lb}` : "—"}
          sub="lbs"
        />
        <StatCard
          label="Goal Weight"
          value={data.goal_weight_lb ? `${data.goal_weight_lb}` : "—"}
          sub="lbs"
          accent="green"
        />
      </Section>

      <Section title="Strength">
        <StatCard label="Bench" value={data.bench_lb ? `${data.bench_lb}` : "—"} sub="lbs, est. 1RM" />
        <StatCard label="Squat" value={data.squat_lb ? `${data.squat_lb}` : "—"} sub="lbs, est. 1RM" />
        <StatCard label="Deadlift" value={data.deadlift_lb ? `${data.deadlift_lb}` : "—"} sub="lbs, est. 1RM" />
      </Section>

      <Section title="Basketball">
        <StatCard label="Shots This Week" value={`${data.shots_this_week}`} />
        <StatCard
          label="Shooting %"
          value={`${data.shooting_pct_this_week}%`}
          accent="green"
        />
      </Section>

      <Section title="Recovery">
        <StatCard
          label="Avg Sleep"
          value={data.avg_sleep_this_week ? `${data.avg_sleep_this_week}h` : "—"}
        />
      </Section>

      <div className="grid md:grid-cols-2 gap-6">
        <Mission />
      </div>
    </main>
  );
}
