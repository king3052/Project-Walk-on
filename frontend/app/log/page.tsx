"use client";

import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { StrengthForm, ShootingForm, NutritionForm, RecoveryForm, BodyweightForm, ConditioningForm } from "@/components/LogForms";
import { QuickLogForm } from "@/components/QuickLogForm";
import { getMe } from "@/lib/api";

const ALL_TABS = [
  { id: "quick", label: "Quick log (AI)" },
  { id: "strength", label: "Strength" },
  { id: "shooting", label: "Shooting" },
  { id: "conditioning", label: "Conditioning" },
  { id: "nutrition", label: "Nutrition" },
  { id: "recovery", label: "Recovery" },
  { id: "body", label: "Body" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

export default function LogPage() {
  const { userId } = useAuth();
  const [tab, setTab] = useState<TabId>("quick");
  const [sport, setSport] = useState("Basketball");

  useEffect(() => {
    getMe()
      .then((u) => setSport(u.sport || "Basketball"))
      .catch(() => {});
  }, []);

  if (!userId) {
    return null;
  }

  const isTennis = sport === "Tennis";
  const tabs = isTennis ? ALL_TABS.filter((t) => t.id !== "shooting") : ALL_TABS;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader title="Log today" />

      {isTennis && (
        <p className="text-xs text-fg-dim rounded-md border border-surface-border bg-surface-panel px-4 py-3">
          Logging a match or practice strokes? Head to{" "}
          <Link href="/tennis/matches" className="text-accent hover:underline">
            Matches
          </Link>{" "}
          or{" "}
          <Link href="/tennis/strokes" className="text-accent hover:underline">
            Strokes
          </Link>{" "}
          in the Tennis section — the tabs here are for general strength, conditioning, and recovery.
        </p>
      )}

      <nav className="flex gap-1 border-b border-surface-border">
        {tabs.map((t) => (
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
        {tab === "quick" && <QuickLogForm userId={userId} />}
        {tab === "strength" && <StrengthForm userId={userId} />}
        {tab === "shooting" && !isTennis && <ShootingForm userId={userId} />}
        {tab === "conditioning" && <ConditioningForm userId={userId} />}
        {tab === "nutrition" && <NutritionForm userId={userId} />}
        {tab === "recovery" && <RecoveryForm userId={userId} />}
        {tab === "body" && <BodyweightForm userId={userId} />}
      </div>
    </main>
  );
}
