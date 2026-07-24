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
        current_game["points"].append({"description": p.get("description", ""), "won": won})
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
    else:
        current_score_label = "Match complete"

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
    }
