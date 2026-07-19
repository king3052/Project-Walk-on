"use client";

import { useAuth } from "@/components/AuthProvider";
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

export default function LogPage() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<TabId>("strength");

  if (!userId) {
    return null;
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
        {tab === "strength" && <StrengthForm userId={userId} />}
        {tab === "shooting" && <ShootingForm userId={userId} />}
        {tab === "conditioning" && <ConditioningForm userId={userId} />}
        {tab === "nutrition" && <NutritionForm userId={userId} />}
        {tab === "recovery" && <RecoveryForm userId={userId} />}
        {tab === "body" && <BodyweightForm userId={userId} />}
      </div>
    </main>
  );
}
