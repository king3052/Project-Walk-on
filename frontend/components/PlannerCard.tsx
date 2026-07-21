"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { getTodayPlan } from "@/lib/api";

export function PlannerCard() {
  const { showToast } = useToast();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onGenerate() {
    setPending(true);
    try {
      const plan = await getTodayPlan();
      setSuggestion(plan.suggestion);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't generate a plan.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Today&apos;s priority</h2>
        <button
          onClick={onGenerate}
          disabled={pending}
          className="text-xs text-accent hover:text-accent-dim disabled:opacity-50 transition-colors"
        >
          {pending ? "Thinking…" : suggestion ? "Refresh" : "Generate"}
        </button>
      </div>
      {suggestion ? (
        <p className="text-sm text-fg leading-relaxed">{suggestion}</p>
      ) : (
        <p className="text-sm text-fg-dim">
          Click generate for an AI suggestion based on your recovery, schedule, and goals.
        </p>
      )}
    </div>
  );
}
