"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import { PageHeader } from "@/components/PageHeader";
import { listMyPlayers, redeemInviteCode, revokeCoachLink, type LinkedPlayer } from "@/lib/api";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

export default function CoachHomePage() {
  const { showToast } = useToast();
  const [players, setPlayers] = useState<LinkedPlayer[]>([]);
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);

  function load() {
    listMyPlayers()
      .then(setPlayers)
      .catch(() => setPlayers([]));
  }
  useEffect(load, []);

  async function onLink(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLinking(true);
    try {
      await redeemInviteCode(code.trim());
      showToast("Player linked.", "success");
      setCode("");
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Invalid or already-used code.", "error");
    } finally {
      setLinking(false);
    }
  }

  async function onRemovePlayer(linkId: string, playerName: string) {
    if (!window.confirm(`Stop coaching ${playerName}? You'll lose access to their training data until they invite you again.`)) {
      return;
    }
    await revokeCoachLink(linkId);
    load();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <PageHeader title="Coach Dashboard" description="Your linked players — comment on their matches and assign drills." />

      <form onSubmit={onLink} className="rounded-lg border border-surface-border bg-surface-panel p-5 space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Link a new player</h2>
        <p className="text-xs text-fg-dim">Ask your player for their invite code (Settings → Coach access).</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="8-character code"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={linking}
            className="text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2 rounded-md transition-colors shrink-0"
          >
            {linking ? "Linking…" : "Link"}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-fg-dim">Your players</h2>
        {players.length === 0 && <p className="text-sm text-fg-dim">No players linked yet.</p>}
        {players.map((p) => (
          <div
            key={p.link_id}
            className="rounded-lg border border-surface-border bg-surface-panel p-4 flex items-center justify-between gap-3 hover:bg-surface-panelHover transition-colors"
          >
            <Link href={`/coaching/players/${p.player_user_id}`} className="flex-1 min-w-0">
              <p className="text-sm text-fg">{p.player_name}</p>
              <p className="text-xs text-fg-dim">{p.player_sport || "Sport not set"}</p>
            </Link>
            <button
              onClick={() => onRemovePlayer(p.link_id, p.player_name)}
              className="text-xs text-fg-dim hover:text-warn px-2 py-1 shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
