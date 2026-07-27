"use client";

import type { TennisMatchState } from "@/lib/api";

const MOOD_EMOJI: Record<string, string> = {
  Confident: "😊",
  Focused: "😐",
  Nervous: "😰",
  Frustrated: "😤",
  Angry: "😠",
  Discouraged: "😔",
};

function SignificanceBadges({ state }: { state: TennisMatchState }) {
  const sig = state.current_point_significance;
  const badges: { label: string; mine: boolean }[] = [];

  if (sig.match_point_for) {
    badges.push({ label: "Match point", mine: sig.match_point_for === "Me" || sig.match_point_for === "Both" });
  } else if (sig.set_point_for) {
    badges.push({ label: "Set point", mine: sig.set_point_for === "Me" || sig.set_point_for === "Both" });
  } else if (sig.break_point_for) {
    badges.push({ label: "Break point", mine: sig.break_point_for === "Me" || sig.break_point_for === "Both" });
  } else if (sig.game_point_for) {
    badges.push({ label: "Game point", mine: sig.game_point_for === "Me" || sig.game_point_for === "Both" });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex justify-center gap-2 pt-1">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`text-xs px-2.5 py-1 rounded-full border ${
            b.mine ? "border-accent/50 text-accent bg-accent/10" : "border-warn/50 text-warn bg-warn/10"
          }`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function ScoreBoard({ state }: { state: TennisMatchState }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-panel p-6 text-center space-y-3">
      {state.match_complete ? (
        <>
          <p className={`font-display text-3xl ${state.match_winner === "Me" ? "text-accent" : "text-warn"}`}>
            {state.match_winner === "Me" ? "You won" : "Opponent won"}
          </p>
          <p className="text-lg text-fg">{state.overall_set_score}</p>
        </>
      ) : (
        <>
          <p className="text-xs uppercase tracking-wide text-fg-dim">Current point score</p>
          <p className="font-display text-5xl text-accent tabular-nums">{state.current_score_label}</p>
          <div className="flex items-center justify-center gap-6 text-sm text-fg-dim pt-2">
            <span>
              This set: <span className="text-fg">{state.current_set_games}</span>
            </span>
            <span>
              Sets: <span className="text-fg">{state.sets_won_me}-{state.sets_won_opponent}</span>
            </span>
          </div>
          {state.overall_set_score !== "0-0" && (
            <p className="text-xs text-fg-dim">{state.overall_set_score}</p>
          )}
          <SignificanceBadges state={state} />
        </>
      )}
    </div>
  );
}

export function PointLogView({ state }: { state: TennisMatchState }) {
  return (
    <div className="space-y-4">
      {state.sets.map((set) => (
        <div key={set.set_number}>
          <p className="text-xs uppercase tracking-wide text-fg-dim mb-2">
            Set {set.set_number}
            {set.is_tiebreak_set ? " (match tiebreak)" : ""}
            {set.complete && !set.is_tiebreak_set ? ` — ${set.games_won.Me}-${set.games_won.Opponent}` : ""}
            {set.tiebreak_score ? ` — ${set.tiebreak_score}` : ""}
          </p>
          <div className="space-y-2">
            {set.games.map((game) => (
              <div key={game.game_number} className="rounded-md border border-surface-border bg-surface-panelHover p-3">
                <p className="text-xs text-fg-dim mb-1">
                  {set.is_tiebreak_set ? "Match tiebreak" : `Game ${game.game_number} — ${game.server === "Me" ? "your serve" : "opponent serve"}`}
                  {game.complete && (
                    <span className={game.winner === "Me" ? "text-accent" : "text-warn"}>
                      {" "}
                      — {game.winner === "Me" ? "Won" : "Lost"}
                    </span>
                  )}
                </p>
                {game.points.length > 0 && (
                  <ul className="space-y-0.5">
                    {game.points.map((p, i) => {
                      const tag =
                        p.match_point_for ? "MP" : p.set_point_for ? "SP" : p.break_point_for ? "BP" : p.game_point_for ? "GP" : null;
                      return (
                        <li key={i} className="text-xs text-fg-muted">
                          <span className={p.won ? "text-accent" : "text-warn"}>{p.won ? "W" : "L"}</span>{" "}
                          {tag && <span className="text-fg-dim">[{tag}]</span>} {p.description || "(no description)"}
                          {(p.shot_type || p.outcome_type) && (
                            <span className="text-fg-dim">
                              {" "}
                              ({[p.shot_type, p.outcome_type].filter(Boolean).join(" / ")})
                            </span>
                          )}
                          {p.mood && (
                            <span className="text-fg-dim" title={p.mood_note || undefined}>
                              {" "}
                              {MOOD_EMOJI[p.mood] || ""} {p.mood}
                              {p.mood_note ? ` — ${p.mood_note}` : ""}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
