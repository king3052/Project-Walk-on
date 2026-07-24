"use client";

import type { TennisMatchState } from "@/lib/api";

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
                    {game.points.map((p, i) => (
                      <li key={i} className="text-xs text-fg-muted">
                        <span className={p.won ? "text-accent" : "text-warn"}>{p.won ? "W" : "L"}</span>{" "}
                        {p.description || "(no description)"}
                      </li>
                    ))}
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
