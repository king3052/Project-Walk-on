"""
Your preset weekly template. Each entry is a 6-tuple:
  (category, subcategory, task, target_count, target_unit, priority)

subcategory/target_count/target_unit are optional (None when not applicable —
e.g. "Journal" entries don't have a rep count). priority is 1-5 and feeds the
AI "Today's Top 5" view (app/routers/mission.py), which ranks the day's full
list down to the highest-impact handful instead of showing everything at once.

"Seed this week" (POST /scheduled-workouts/seed-week) turns this into real
ScheduledWorkout rows on the calendar for a given week, skipping any
day/task that's already there so it's safe to run more than once.

mark_category_done() / mark_matching_done() are called by the various
logging routers right after a real log is saved — they check off any
not-yet-completed scheduled items for that date, so you're not re-checking
boxes for things you already logged elsewhere in the app.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# Basketball
# ---------------------------------------------------------------------------
BASKETBALL_WEEKLY_TEMPLATE: dict[str, list[tuple]] = {
    "Monday": [
        ("Basketball", "Warm-up", "Dynamic Warmup", None, None, 3),
        ("Basketball", "Warm-up", "Band Activation", None, None, 2),
        ("Basketball", "Shooting", "Form Makes", 100, "makes", 5),
        ("Basketball", "Shooting", "Midrange", 100, "makes", 5),
        ("Basketball", "Shooting", "Catch & Shoot", 200, "makes", 5),
        ("Basketball", "Shooting", "Game-Speed Threes", 100, "makes", 4),
        ("Basketball", "Shooting", "Free Throws", 50, "makes", 4),
        ("Strength", None, "Back Squat", 5, "x5", 5),
        ("Strength", None, "Bulgarian Split Squat", 3, "x8", 4),
        ("Strength", None, "Romanian Deadlift", 3, "x8", 4),
        ("Strength", None, "Core work", None, None, 3),
        ("Conditioning", None, "10x20m sprints", 10, "reps", 4),
        ("Recovery", None, "Sleep 8 hours", None, None, 4),
    ],
    "Tuesday": [
        ("Basketball", "Ball Handling", "Stationary Series", 5, "min", 4),
        ("Basketball", "Ball Handling", "Full Court Combo Series", 10, "min", 4),
        ("Basketball", "Ball Handling", "Weak Hand Only", 10, "min", 5),
        ("Basketball", "Finishing", "Mikan", 50, "reps", 4),
        ("Basketball", "Finishing", "Reverse Mikan", 50, "reps", 4),
        ("Basketball", "Finishing", "Euro Steps", 30, "reps", 3),
        ("Basketball", "Finishing", "Contact Finishes", 30, "reps", 4),
        ("Strength", None, "Bench Press", 5, "x5", 5),
        ("Strength", None, "Pull-ups", 4, "x8", 4),
        ("Strength", None, "Face Pulls", 3, "x15", 2),
        ("Athleticism", None, "Vertical Jumps", 5, "sets", 4),
        ("Athleticism", None, "Sprint Starts", 6, "reps", 3),
        ("Recovery", None, "Stretch", None, None, 3),
    ],
    "Wednesday": [
        ("Basketball", "Athletic Skills", "Defensive Slides", 5, "min", 3),
        ("Basketball", "Athletic Skills", "Closeouts", 20, "reps", 3),
        ("Recovery", None, "Foam Roll", None, None, 3),
        ("Recovery", None, "Contrast Shower", None, None, 2),
        ("Mental", None, "Visualization", 10, "min", 3),
        ("Mental", None, "Journal", None, None, 2),
        ("Film", None, "Watch Film — 1 NBA player breakdown", 20, "min", 2),
        ("Learning", None, "Read Sports Science article", None, None, 2),
    ],
    "Thursday": [
        ("Basketball", "Shooting", "Off Dribble", 100, "makes", 5),
        ("Basketball", "Shooting", "Movement Shooting", 100, "makes", 4),
        ("Basketball", "Shooting", "Free Throws", 50, "makes", 4),
        ("Strength", None, "Front Squat", 4, "x6", 5),
        ("Strength", None, "Rows", 3, "x10", 3),
        ("Strength", None, "Core work", None, None, 3),
        ("Conditioning", None, "Suicide Runs", 6, "reps", 4),
        ("Recovery", None, "Sleep 8 hours", None, None, 4),
    ],
    "Friday": [
        ("Basketball", "Ball Handling", "Game-Speed Moves", 10, "min", 4),
        ("Basketball", "Finishing", "Floaters", 30, "reps", 4),
        ("Basketball", "Finishing", "Left Hand", 30, "reps", 4),
        ("Basketball", "Finishing", "Right Hand", 30, "reps", 4),
        ("Basketball", "Finishing", "Spin Finishes", 30, "reps", 3),
        ("Strength", None, "Incline DB Press", 4, "x8", 4),
        ("Strength", None, "Pull-ups", 4, "x8", 4),
        ("Athleticism", None, "Broad Jumps", 5, "sets", 4),
        ("Athleticism", None, "Agility ladder", 10, "min", 3),
        ("Recovery", None, "Stretch", None, None, 3),
    ],
    "Saturday": [
        ("Basketball", "Shooting", "Game-Speed Threes", 100, "makes", 5),
        ("Basketball", "Athletic Skills", "Sprint Starts", 6, "reps", 3),
        ("Basketball", "Athletic Skills", "Vertical Work", None, None, 3),
        ("Conditioning", None, "Tempo Run", 20, "min", 3),
        ("Learning", None, "Learn a new move", None, None, 2),
        ("Learning", None, "Notes", None, None, 1),
    ],
    "Sunday": [
        ("Recovery", None, "Stretch", None, None, 3),
        ("Recovery", None, "Foam Roll", None, None, 3),
        ("Recovery", None, "Sleep 9 hours", None, None, 4),
        ("Analytics", None, "Weight trend", None, None, 2),
        ("Analytics", None, "Weekly report", None, None, 2),
        ("Journal", None, "Weekly reflection", None, None, 2),
        ("Journal", None, "Wins", None, None, 2),
        ("Journal", None, "Areas to improve", None, None, 2),
        ("Life", None, "Plan next week", None, None, 2),
        ("Life", None, "Calendar review", None, None, 1),
    ],
}

# ---------------------------------------------------------------------------
# Tennis
# ---------------------------------------------------------------------------
TENNIS_WEEKLY_TEMPLATE: dict[str, list[tuple]] = {
    "Monday": [
        ("Tennis", "Serve", "First Serve Placement", 50, "serves", 5),
        ("Tennis", "Serve", "Second Serve Consistency", 50, "serves", 5),
        ("Tennis", "Groundstrokes", "Forehand Crosscourt", 15, "min", 5),
        ("Tennis", "Groundstrokes", "Backhand Crosscourt", 15, "min", 5),
        ("Strength", None, "Back Squat", 5, "x5", 5),
        ("Strength", None, "Core work", None, None, 3),
        ("Conditioning", None, "Sprint + change-of-direction", 15, "min", 4),
        ("Recovery", None, "Sleep 8 hours", None, None, 4),
        ("Life", None, "Calendar review", None, None, 1),
    ],
    "Tuesday": [
        ("Tennis", "Groundstrokes", "Forehand Down-the-Line", 15, "min", 4),
        ("Tennis", "Groundstrokes", "Backhand Down-the-Line", 15, "min", 4),
        ("Tennis", "Footwork", "Split-Step + Recovery Drills", 10, "min", 4),
        ("Strength", None, "Bench Press", 5, "x5", 5),
        ("Strength", None, "Pull-ups", 4, "x8", 4),
        ("Recovery", None, "Stretch", None, None, 3),
        ("Film", None, "Review own match footage", 20, "min", 2),
        ("Analytics", None, "Log everything", None, None, 2),
    ],
    "Wednesday": [
        ("Tennis", "Serve", "Serve Placement — Targets", 40, "serves", 5),
        ("Tennis", "Groundstrokes", "Live Rally — Crosscourt Consistency", 20, "min", 4),
        ("Tennis", "Footwork", "Sprint + Change-of-Direction Conditioning", 15, "min", 4),
        ("Athleticism", None, "Explosive/Plyometric Work", None, None, 4),
        ("Recovery", None, "Mobility Session", None, None, 3),
        ("Mental", None, "Visualization", 10, "min", 3),
    ],
    "Thursday": [
        ("Tennis", "Groundstrokes", "Approach Shots + Volleys", 15, "min", 4),
        ("Tennis", "Groundstrokes", "Overheads", 20, "reps", 3),
        ("Strength", None, "Front Squat", 4, "x6", 5),
        ("Strength", None, "Rows", 3, "x10", 3),
        ("Tennis", "Footwork", "Agility Ladder Circuit", 10, "min", 3),
        ("Recovery", None, "Sleep 8 hours", None, None, 4),
    ],
    "Friday": [
        ("Tennis", "Serve", "Second Serve Under Pressure", 40, "serves", 5),
        ("Tennis", "Groundstrokes", "Return of Serve Practice", 15, "min", 4),
        ("Tennis", "Footwork", "Court Coverage Drills", 15, "min", 4),
        ("Athleticism", None, "Speed/Agility Session", None, None, 4),
        ("Recovery", None, "Stretch", None, None, 3),
    ],
    "Saturday": [
        ("Tennis", "Match Play", "Practice Sets", None, None, 5),
        ("Tennis", "Footwork", "Match-Intensity Movement", 15, "min", 3),
        ("Recovery", None, "Long Mobility Session", None, None, 3),
        ("Film", None, "Analyze your own match footage", 20, "min", 2),
        ("Learning", None, "Learn a new tactic", None, None, 2),
    ],
    "Sunday": [
        ("Recovery", None, "Walk", None, None, 2),
        ("Recovery", None, "Stretch", None, None, 3),
        ("Recovery", None, "Mobility", None, None, 3),
        ("Recovery", None, "Sleep 9 hours", None, None, 4),
        ("Analytics", None, "Weekly report", None, None, 2),
        ("Analytics", None, "Weight trend", None, None, 2),
        ("Analytics", None, "First-serve percentage trend", None, None, 2),
        ("Life", None, "Plan next week", None, None, 2),
        ("Life", None, "Schedule court time", None, None, 1),
        ("Journal", None, "Weekly reflection", None, None, 2),
        ("Journal", None, "Wins", None, None, 2),
        ("Journal", None, "Areas to improve", None, None, 2),
    ],
}

TEMPLATES_BY_SPORT = {
    "Basketball": BASKETBALL_WEEKLY_TEMPLATE,
    "Tennis": TENNIS_WEEKLY_TEMPLATE,
}

# Sunday-first, matching how the calendar and "seed this week" button treat the week.
WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]


def get_or_bootstrap_template(db: Session, models, user_id: str, sport: str = "Basketball") -> list:
    """Returns the athlete's own editable template rows, creating them from the
    sport's default the first time (so editing one athlete's copy never affects
    anyone else's, and never affects the built-in defaults)."""
    items = db.query(models.TemplateItem).filter(models.TemplateItem.user_id == user_id).all()
    if items:
        return items

    default = TEMPLATES_BY_SPORT.get(sport, BASKETBALL_WEEKLY_TEMPLATE)
    new_items = []
    for weekday_name, tasks in default.items():
        for sort_order, (category, subcategory, task, target_count, target_unit, priority) in enumerate(tasks):
            item = models.TemplateItem(
                user_id=user_id, weekday=weekday_name, category=category, subcategory=subcategory,
                task=task, target_count=target_count, target_unit=target_unit, priority=priority,
                sort_order=sort_order,
            )
            db.add(item)
            new_items.append(item)
    db.commit()
    for item in new_items:
        db.refresh(item)
    return new_items


def seed_week(db: Session, models, user_id: str, week_start: date, sport: str = "Basketball") -> int:
    """Creates ScheduledWorkout rows for week_start..week_start+6 (week_start should be
    a Sunday) from the athlete's own editable template. Skips any (date, title) pair
    that already exists, so it's safe to call repeatedly."""
    items = get_or_bootstrap_template(db, models, user_id, sport)
    by_weekday: dict[str, list] = {}
    for item in items:
        by_weekday.setdefault(item.weekday, []).append(item)

    week_dates = [week_start + timedelta(days=i) for i in range(7)]

    existing = set(
        (row.date, row.title)
        for row in db.query(models.ScheduledWorkout)
        .filter(
            models.ScheduledWorkout.user_id == user_id,
            models.ScheduledWorkout.date.in_(week_dates),
        )
        .all()
    )

    created = 0
    for i, day in enumerate(week_dates):
        weekday_name = WEEKDAY_NAMES[i]
        for item in sorted(by_weekday.get(weekday_name, []), key=lambda x: x.sort_order):
            title = item.task
            if item.target_count and item.target_unit:
                title = f"{item.task} ({item.target_count} {item.target_unit})"
            if (day, title) in existing:
                continue
            db.add(
                models.ScheduledWorkout(
                    user_id=user_id, date=day, workout_type=item.category, title=title,
                    priority=item.priority,
                )
            )
            created += 1
    db.commit()
    return created


def mark_category_done(db: Session, models, user_id: str, log_date: date, categories: list) -> None:
    """Checks off any not-yet-completed scheduled items whose category is in
    `categories` for this date — called right after a real log (nutrition,
    recovery, etc.) is saved, for holistic categories where one log covers
    the whole category."""
    items = (
        db.query(models.ScheduledWorkout)
        .filter(
            models.ScheduledWorkout.user_id == user_id,
            models.ScheduledWorkout.date == log_date,
            models.ScheduledWorkout.workout_type.in_(categories),
            models.ScheduledWorkout.completed.is_(False),
        )
        .all()
    )
    for item in items:
        item.completed = True
    db.commit()


def mark_matching_done(db: Session, models, user_id: str, log_date: date, category: str, name_fragments: list) -> None:
    """Like mark_category_done, but only checks off scheduled items in
    `category` whose title contains one of `name_fragments` — for itemized
    categories (Strength, Conditioning, Basketball/Tennis drills) where each
    exercise is its own checklist item, not one blanket category checkbox."""
    items = (
        db.query(models.ScheduledWorkout)
        .filter(
            models.ScheduledWorkout.user_id == user_id,
            models.ScheduledWorkout.date == log_date,
            models.ScheduledWorkout.workout_type == category,
            models.ScheduledWorkout.completed.is_(False),
        )
        .all()
    )
    fragments_lower = [f.lower() for f in name_fragments]
    for item in items:
        title_lower = item.title.lower()
        if any(fragment in title_lower for fragment in fragments_lower):
            item.completed = True
    db.commit()
