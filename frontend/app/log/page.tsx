"use client";

import { useState } from "react";
import Link from "next/link";
import { StrengthForm, ShootingForm, NutritionForm, RecoveryForm } from "@/components/LogForms";

const TABS = [
  { id: "strength", label: "Strength" },
  { id: "shooting", label: "Shooting" },
  { id: "nutrition", label: "Nutrition" },
  { id: "recovery", label: "Recovery" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

export default function LogPage() {
  const [tab, setTab] = useState<TabId>("strength");

  if (!DEMO_USER_ID) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-chalk-muted">
          Set <code className="text-hardwood-light">NEXT_PUBLIC_DEMO_USER_ID</code> in{" "}
          <code className="text-hardwood-light">frontend/.env.local</code> to your user id before logging data.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <header className="flex items-baseline justify-between border-b border-court-line pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-hardwood-light mb-1">Project Walk-On</p>
          <h1 className="font-display text-4xl tracking-tight">Log Today</h1>
        </div>
        <Link href="/" className="text-sm text-chalk-muted hover:text-hardwood-light transition-colors">
          ← Dashboard
        </Link>
      </header>

      <nav className="flex gap-2 border-b border-court-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`font-display uppercase tracking-widest text-sm px-4 py-2 border-b-2 transition-colors ${
              tab === t.id
                ? "border-hardwood text-hardwood-light"
                : "border-transparent text-chalk-dim hover:text-chalk-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div>
        {tab === "strength" && <StrengthForm userId={DEMO_USER_ID} />}
        {tab === "shooting" && <ShootingForm userId={DEMO_USER_ID} />}
        {tab === "nutrition" && <NutritionForm userId={DEMO_USER_ID} />}
        {tab === "recovery" && <RecoveryForm userId={DEMO_USER_ID} />}
      </div>
    </main>
  );
}
