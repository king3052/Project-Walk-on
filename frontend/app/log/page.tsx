"use client";

import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { StrengthForm, ShootingForm, NutritionForm, RecoveryForm, BodyweightForm, ConditioningForm } from "@/components/LogForms";

const TABS = [
  { id: "strength", label: "Strength" },
  { id: "shooting", label: "Shooting" },
  { id: "conditioning", label: "Conditioning" },
  { id: "nutrition", label: "Nutrition" },
  { id: "recovery", label: "Recovery" },
  { id: "body", label: "Body" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "";

export default function LogPage() {
  const [tab, setTab] = useState<TabId>("strength");

  if (!DEMO_USER_ID) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-fg-muted">
          Set <code className="text-accent">NEXT_PUBLIC_DEMO_USER_ID</code> in{" "}
          <code className="text-accent">frontend/.env.local</code> to your user id before logging data.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
<PageHeader title="Log today" />

      <nav className="flex gap-1 border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-fg-dim hover:text-fg-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div>
        {tab === "strength" && <StrengthForm userId={DEMO_USER_ID} />}
        {tab === "shooting" && <ShootingForm userId={DEMO_USER_ID} />}
        {tab === "conditioning" && <ConditioningForm userId={DEMO_USER_ID} />}
        {tab === "nutrition" && <NutritionForm userId={DEMO_USER_ID} />}
        {tab === "recovery" && <RecoveryForm userId={DEMO_USER_ID} />}
        {tab === "body" && <BodyweightForm userId={DEMO_USER_ID} />}
      </div>
    </main>
  );
}
