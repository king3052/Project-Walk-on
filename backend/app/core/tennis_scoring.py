"""
Tennis scoring engine.

The only stored data is an ordered log of points (description + who won
each point). Everything else — game score, set score, whose serve, match
completion — is DERIVED by replaying that log through this engine. This
means there's a single source of truth and no risk of stored Game/Set
records drifting out of sync with the actual point log: undo is just
"delete the last point and replay," always correct by construction.

Supported formats:
  - "best_of_3"        : first to 2 sets, every set (including 3rd) played
                          out normally (6 games, tiebreak at 6-6)
  - "best_of_3_tb10"    : first to 2 sets; if it reaches a 3rd set, that
                          set is replaced entirely by a single first-to-10
                          (win by 2) match tiebreak
  - "single_set"        : first (only) set decides the match
  - "best_of_5"         : first to 3 sets, all sets played out normally

Ad vs no-ad is a per-match setting: at 40-40 in ad scoring, the game
continues to advantage/deuce until someone wins by 2; in no-ad scoring,
the next point at 40-40 decides the game outright.
"""

POINT_LABELS = ["0", "15", "30", "40"]

SETS_NEEDED = {
    "best_of_3": 2,
    "best_of_3_tb10": 2,
    "single_set": 1,
    "best_of_5": 3,
}


def _game_score_label(me: int, opp: int, no_ad: bool) -> str:
    if me >= 3 and opp >= 3:
        if me == opp:
            return "Deciding point" if no_ad else "Deuce"
        if not no_ad:
            return "Ad — you" if me > opp else "Ad — opponent"
    return f"{POINT_LABELS[min(me, 3)]}-{POINT_LABELS[min(opp, 3)]}"


def _is_game_won(me: int, opp: int, no_ad: bool):
    if no_ad:
        if me >= 4 and me > opp:
            return "Me"
        if opp >= 4 and opp > me:
            return "Opponent"
        return None
    if me >= 4 and me - opp >= 2:
        return "Me"
    if opp >= 4 and opp - me >= 2:
        return "Opponent"
    return None


def _tiebreak_label(me: int, opp: int) -> str:
    return f"{me}-{opp} (TB)"


def _is_tiebreak_won(me: int, opp: int, target: int):
    if me >= target and me - opp >= 2:
        return "Me"
    if opp >= target and opp - me >= 2:
        return "Opponent"
    return None


def _would_win_game(score_me: int, score_opp: int, no_ad: bool, is_tiebreak: bool, tb_target: int = 7) -> dict:
    """For the CURRENT (not-yet-played) point, which side(s) would win the game
    if they won this next point."""
    result = {"Me": False, "Opponent": False}
    if is_tiebreak:
        if _is_tiebreak_won(score_me + 1, score_opp, tb_target) == "Me":
            result["Me"] = True
        if _is_tiebreak_won(score_me, score_opp + 1, tb_target) == "Opponent":
            result["Opponent"] = True
    else:
        if _is_game_won(score_me + 1, score_opp, no_ad) == "Me":
            result["Me"] = True
        if _is_game_won(score_me, score_opp + 1, no_ad) == "Opponent":
            result["Opponent"] = True
    return result


def _would_win_set(games_me: int, games_opp: int, side: str) -> bool:
    """Given a side just won a game (games_me/games_opp already include that
    win), would that also clinch the set."""
    me, opp = (games_me, games_opp) if side == "Me" else (games_opp, games_me)
    if me >= 6 and me - opp >= 2:
        return True
    if me == 7:
        return True  # either a 7-5 set or a 7-6 tiebreak win
    return False


def _single_or_both(sides: list) -> str | None:
    if len(sides) == 0:
        return None
    if len(sides) == 1:
        return sides[0]
    return "Both"  # e.g. a no-ad deciding point is a game point for both players at once


def _point_significance(
    current_game: dict,
    current_set: dict,
    sets_won: dict,
    sets_needed: int,
    no_ad: bool,
) -> dict:
    """Computes, for the point about to be played, whether it's a game point,
    break point, set point, and/or match point — for either side. Purely a
    function of the state already tracked, so it costs nothing extra to
    derive; it's just never been surfaced before."""
    if current_set["is_tiebreak_set"]:
        would_win_game = _would_win_game(current_game["score_me"], current_game["score_opp"], no_ad, True, 10)
    else:
        would_win_game = _would_win_game(
            current_game["score_me"], current_game["score_opp"], no_ad, current_game["is_tiebreak"]
        )

    game_point_for = [side for side, v in would_win_game.items() if v]

    break_point_for = [
        side for side in game_point_for
        if not current_set["is_tiebreak_set"] and current_game["server"] != side
    ]

    set_point_for = []
    match_point_for = []
    for side in game_point_for:
        if current_set["is_tiebreak_set"]:
            set_point_for.append(side)
        else:
            games_me = current_set["games_won"]["Me"] + (1 if side == "Me" else 0)
            games_opp = current_set["games_won"]["Opponent"] + (1 if side == "Opponent" else 0)
            if _would_win_set(games_me, games_opp, side):
                set_point_for.append(side)
        if side in set_point_for and sets_won[side] + 1 >= sets_needed:
            match_point_for.append(side)

    return {
        "game_point_for": _single_or_both(game_point_for),
        "break_point_for": _single_or_both(break_point_for),
        "set_point_for": _single_or_both(set_point_for),
        "match_point_for": _single_or_both(match_point_for),
    }


def summarize_points(state: dict) -> dict:
    """Walks every point in a replayed match and turns the raw log into hard,
    countable numbers — break/game/set/match point conversion, and shot
    type / outcome type tallies where tagged. This is fed to the AI as
    ground truth instead of asking it to infer counts from prose."""
    all_points = [p for s in state["sets"] for g in s["games"] for p in g["points"]]

    def conversion(key: str) -> dict:
        me_chances = sum(1 for p in all_points if p.get(key) in ("Me", "Both"))
        me_won = sum(1 for p in all_points if p.get(key) in ("Me", "Both") and p["won"])
        opp_chances = sum(1 for p in all_points if p.get(key) in ("Opponent", "Both"))
        opp_won = sum(1 for p in all_points if p.get(key) in ("Opponent", "Both") and not p["won"])
        return {"me_won": me_won, "me_chances": me_chances, "opp_won": opp_won, "opp_chances": opp_chances}

    shot_type_outcomes: dict = {}
    for p in all_points:
        if p.get("shot_type") or p.get("outcome_type"):
            key = f"{p.get('shot_type') or 'Unspecified'} / {p.get('outcome_type') or 'unspecified'}"
            shot_type_outcomes[key] = shot_type_outcomes.get(key, 0) + 1

    mood_stats: dict = {}
    for p in all_points:
        mood = p.get("mood")
        if not mood:
            continue
        entry = mood_stats.setdefault(mood, {"count": 0, "won": 0, "on_pressure_point": 0})
        entry["count"] += 1
        if p["won"]:
            entry["won"] += 1
        if p.get("break_point_for") or p.get("game_point_for") or p.get("set_point_for") or p.get("match_point_for"):
            entry["on_pressure_point"] += 1

    return {
        "total_points": len(all_points),
        "points_won": sum(1 for p in all_points if p["won"]),
        "break_points": conversion("break_point_for"),
        "game_points": conversion("game_point_for"),
        "set_points": conversion("set_point_for"),
        "match_points": conversion("match_point_for"),
        "shot_type_outcomes": shot_type_outcomes,
        "mood_stats": mood_stats,
    }


def replay_match(
    points: list,
    scoring_format: str = "best_of_3",
    no_ad: bool = False,
    first_server: str = "Me",
) -> dict:
    """
    points: ordered list of {"description": str, "won": bool} (won = the
    tracked athlete won that point).
    """
    sets_needed = SETS_NEEDED.get(scoring_format, 2)

    sets = []
    sets_won = {"Me": 0, "Opponent": 0}
    match_winner = None
    match_complete = False

    def new_set(is_tiebreak_set):
        return {
            "set_number": len(sets) + 1,
            "games": [],
            "games_won": {"Me": 0, "Opponent": 0},
            "is_tiebreak_set": is_tiebreak_set,
            "tiebreak_score": None,
            "winner": None,
            "complete": False,
        }

    def is_deciding_set(set_index):
        return scoring_format == "best_of_3_tb10" and set_index == sets_needed * 2 - 2

    def new_game(cur_set):
        game_number = len(cur_set["games"]) + 1
        total_games_played = sum(len(s["games"]) for s in sets) + game_number - 1
        server = first_server if total_games_played % 2 == 0 else ("Opponent" if first_server == "Me" else "Me")
        is_tb_game = cur_set["games_won"]["Me"] == 6 and cur_set["games_won"]["Opponent"] == 6
        return {
            "game_number": game_number,
            "server": server,
            "points": [],
            "score_me": 0,
            "score_opp": 0,
            "is_tiebreak": is_tb_game,
            "winner": None,
            "complete": False,
        }

    current_set = new_set(is_deciding_set(0))
    sets.append(current_set)
    current_game = new_game(current_set)
    current_set["games"].append(current_game)

    for p in points:
        if match_complete:
            break  # ignore any stray extra points logged after match end

        won = bool(p.get("won"))
        significance = _point_significance(current_game, current_set, sets_won, sets_needed, no_ad)
        current_game["points"].append({
            "description": p.get("description", ""),
            "won": won,
            "shot_type": p.get("shot_type"),
            "outcome_type": p.get("outcome_type"),
            "mood": p.get("mood"),
            "mood_note": p.get("mood_note"),
            **significance,
        })
        if won:
            current_game["score_me"] += 1
        else:
            current_game["score_opp"] += 1

        if current_set["is_tiebreak_set"]:
            target = 10
            winner = _is_tiebreak_won(current_game["score_me"], current_game["score_opp"], target)
            if winner:
                current_game["complete"] = True
                current_game["winner"] = winner
                current_set["tiebreak_score"] = f"{current_game['score_me']}-{current_game['score_opp']}"
                current_set["complete"] = True
                current_set["winner"] = winner
                sets_won[winner] += 1
        else:
            if current_game["is_tiebreak"]:
                winner = _is_tiebreak_won(current_game["score_me"], current_game["score_opp"], 7)
            else:
                winner = _is_game_won(current_game["score_me"], current_game["score_opp"], no_ad)

            if winner:
                current_game["complete"] = True
                current_game["winner"] = winner
                current_set["games_won"][winner] += 1

                me_g, opp_g = current_set["games_won"]["Me"], current_set["games_won"]["Opponent"]
                set_winner = None
                if current_game["is_tiebreak"]:
                    set_winner = winner
                elif me_g >= 6 and me_g - opp_g >= 2:
                    set_winner = "Me"
                elif opp_g >= 6 and opp_g - me_g >= 2:
                    set_winner = "Opponent"
                elif me_g == 7 or opp_g == 7:
                    set_winner = "Me" if me_g == 7 else "Opponent"

                if set_winner:
                    current_set["complete"] = True
                    current_set["winner"] = set_winner
                    sets_won[set_winner] += 1
                else:
                    current_game = new_game(current_set)
                    current_set["games"].append(current_game)

        # Shared match-completion check — runs for BOTH the tiebreak-set branch
        # and the normal-set branch, so a deciding match-tiebreak set correctly
        # ends the match instead of silently continuing (a real bug caught by
        # testing: the tiebreak-set branch used to `continue` past this check).
        if current_set["complete"]:
            if sets_won["Me"] >= sets_needed or sets_won["Opponent"] >= sets_needed:
                match_complete = True
                match_winner = "Me" if sets_won["Me"] > sets_won["Opponent"] else "Opponent"
            else:
                current_set = new_set(is_deciding_set(len(sets)))
                sets.append(current_set)
                current_game = new_game(current_set)
                current_set["games"].append(current_game)

    if not match_complete:
        if current_set["is_tiebreak_set"]:
            current_score_label = _tiebreak_label(current_game["score_me"], current_game["score_opp"])
        elif current_game["is_tiebreak"]:
            current_score_label = _tiebreak_label(current_game["score_me"], current_game["score_opp"])
        else:
            current_score_label = _game_score_label(current_game["score_me"], current_game["score_opp"], no_ad)
        current_point_significance = _point_significance(current_game, current_set, sets_won, sets_needed, no_ad)
    else:
        current_score_label = "Match complete"
        current_point_significance = {
            "game_point_for": None, "break_point_for": None, "set_point_for": None, "match_point_for": None
        }

    set_summaries = []
    for s in sets:
        if s["is_tiebreak_set"] and s["tiebreak_score"]:
            set_summaries.append(f"[{s['tiebreak_score']}]")
        elif s["games_won"]["Me"] or s["games_won"]["Opponent"]:
            label = f"{s['games_won']['Me']}-{s['games_won']['Opponent']}"
            if s.get("winner") and max(s["games_won"].values()) == 7 and min(s["games_won"].values()) == 6:
                label += "(7)"
            set_summaries.append(label)

    return {
        "sets": sets,
        "sets_won_me": sets_won["Me"],
        "sets_won_opponent": sets_won["Opponent"],
        "match_complete": match_complete,
        "match_winner": match_winner,
        "current_score_label": current_score_label,
        "current_set_games": f"{current_set['games_won']['Me']}-{current_set['games_won']['Opponent']}",
        "overall_set_score": ", ".join(set_summaries) if set_summaries else "0-0",
        "current_point_significance": current_point_significance,
    }
