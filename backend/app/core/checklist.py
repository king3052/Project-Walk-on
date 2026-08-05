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
        ("Mission", None, "Read Morning Briefing", None, None, 2),
        ("Mission", None, "Review today's priorities", None, None, 2),
        ("Mission", None, "Set today's focus", None, None, 2),
        ("Basketball", "Warm-up", "Foam roll", 5, "min", 2),
        ("Basketball", "Warm-up", "Dynamic warm-up", 10, "min", 3),
        ("Basketball", "Warm-up", "Band activation", None, None, 2),
        ("Basketball", "Warm-up", "Movement prep", None, None, 2),
        ("Basketball", "Ball Handling", "Stationary series", 100, "reps", 4),
        ("Basketball", "Ball Handling", "Two-ball series", 5, "min", 4),
        ("Basketball", "Ball Handling", "Weak-hand only", 10, "min", 5),
        ("Basketball", "Ball Handling", "Change-of-pace drills", 10, "min", 4),
        ("Basketball", "Ball Handling", "Full-court combos", None, None, 4),
        ("Basketball", "Shooting", "Form makes", 100, "makes", 5),
        ("Basketball", "Shooting", "Midrange", 100, "makes", 5),
        ("Basketball", "Shooting", "Catch-and-shoot", 200, "makes", 5),
        ("Basketball", "Shooting", "Movement threes", 100, "makes", 4),
        ("Basketball", "Shooting", "Off-dribble", 100, "makes", 4),
        ("Basketball", "Shooting", "Free throws", 50, "makes", 4),
        ("Basketball", "Shooting", "Record shooting %", None, None, 2),
        ("Basketball", "Finishing", "Mikan drill", None, None, 4),
        ("Basketball", "Finishing", "Reverse Mikan", None, None, 4),
        ("Basketball", "Finishing", "Floater series", None, None, 4),
        ("Basketball", "Finishing", "Euro steps", None, None, 3),
        ("Basketball", "Finishing", "Contact finishes", None, None, 4),
        ("Basketball", "Finishing", "Weak-hand finishes", None, None, 4),
        ("Basketball", "Defense", "Closeouts", None, None, 3),
        ("Basketball", "Defense", "Defensive slides", None, None, 3),
        ("Basketball", "Defense", "Mirror drill", None, None, 3),
        ("Strength", "Lower Power", "Back Squat", None, None, 5),
        ("Strength", "Lower Power", "Romanian Deadlift", None, None, 4),
        ("Strength", "Lower Power", "Bulgarian Split Squat", None, None, 4),
        ("Strength", "Lower Power", "Box Jumps", None, None, 4),
        ("Strength", "Lower Power", "Standing Calf Raises", None, None, 2),
        ("Strength", "Lower Power", "Hanging Leg Raises", None, None, 3),
        ("Strength", "Lower Power", "Planks", None, None, 3),
        ("Athleticism", None, "Vertical jumps", None, None, 4),
        ("Athleticism", None, "Broad jumps", None, None, 4),
        ("Athleticism", None, "Sprints", 10, "x20m", 4),
        ("Athleticism", None, "Acceleration drills", None, None, 3),
        ("Nutrition", None, "Calories", 3700, "kcal", 4),
        ("Nutrition", None, "Protein", 190, "g", 4),
        ("Nutrition", None, "Carbs", 475, "g", 3),
        ("Nutrition", None, "Fat", 90, "g", 3),
        ("Nutrition", None, "Water", 5, "L", 3),
        ("Nutrition", None, "Post-workout shake", None, None, 3),
        ("Recovery", None, "Stretch", None, None, 3),
        ("Recovery", None, "Foam roll", None, None, 3),
        ("Recovery", None, "Massage gun", None, None, 2),
        ("Recovery", None, "Mobility", None, None, 3),
        ("Recovery", None, "Sleep 8+ hours", None, None, 4),
        ("Film", None, "Watch film — 20 min breakdown", 20, "min", 2),
        ("Mental", None, "Visualization", None, None, 3),
        ("Mental", None, "Journal", None, None, 2),
        ("Mental", None, "Gratitude", None, None, 2),
        ("Mental", None, "Confidence rating", None, None, 2),
        ("Analytics", None, "Body weight", None, None, 2),
        ("Analytics", None, "Energy", None, None, 2),
        ("Analytics", None, "Soreness", None, None, 2),
        ("Analytics", None, "Readiness", None, None, 2),
        ("Analytics", None, "Mood", None, None, 2),
        ("Analytics", None, "Practice rating", None, None, 2),
        ("Life", None, "Homework", None, None, 2),
        ("Life", None, "Calendar review", None, None, 1),
        ("Life", None, "Backpack ready", None, None, 1),
        ("Life", None, "Clothes ready", None, None, 1),
    ],
    "Tuesday": [
        ("Basketball", None, "Ball handling", None, None, 4),
        ("Basketball", None, "Pick-and-roll reads", None, None, 4),
        ("Basketball", None, "Pull-up jumpers", None, None, 4),
        ("Basketball", None, "Spot-up shooting", None, None, 4),
        ("Basketball", None, "Floaters", None, None, 3),
        ("Basketball", None, "Free throws", None, None, 4),
        ("Strength", None, "Bench Press", None, None, 5),
        ("Strength", None, "Pull-ups", None, None, 4),
        ("Strength", None, "Barbell Rows", None, None, 4),
        ("Strength", None, "Shoulder Press", None, None, 3),
        ("Strength", None, "Face Pulls", None, None, 2),
        ("Strength", None, "Triceps", None, None, 3),
        ("Strength", None, "Biceps", None, None, 2),
        ("Conditioning", None, "Bike intervals", None, None, 3),
        ("Conditioning", None, "Core circuit", None, None, 3),
        ("Film", None, "Elite guard shot creation", None, None, 2),
        ("Recovery", None, "Stretch", None, None, 3),
        ("Recovery", None, "Shoulder mobility", None, None, 3),
        ("Nutrition", None, "Calories", 3700, "kcal", 4),
        ("Nutrition", None, "Protein", 190, "g", 4),
        ("Nutrition", None, "Carbs", 475, "g", 3),
        ("Nutrition", None, "Fat", 90, "g", 3),
        ("Nutrition", None, "Water", 5, "L", 3),
        ("Analytics", None, "Body weight", None, None, 2),
        ("Analytics", None, "Energy", None, None, 2),
        ("Analytics", None, "Soreness", None, None, 2),
        ("Analytics", None, "Readiness", None, None, 2),
        ("Analytics", None, "Mood", None, None, 2),
        ("Analytics", None, "Practice rating", None, None, 2),
        ("Mental", None, "Visualization", None, None, 3),
        ("Mental", None, "Journal", None, None, 2),
        ("Mental", None, "Confidence rating", None, None, 2),
    ],
    "Wednesday": [
        ("Basketball", None, "Live dribble work", None, None, 4),
        ("Basketball", None, "Finishing", None, None, 4),
        ("Basketball", None, "Midrange", None, None, 4),
        ("Basketball", None, "Transition offense", None, None, 4),
        ("Basketball", None, "Defensive footwork", None, None, 3),
        ("Strength", None, "Power Cleans", None, None, 5),
        ("Strength", None, "Jump squats", None, None, 4),
        ("Strength", None, "Single-leg strength", None, None, 4),
        ("Strength", None, "Nordic curls", None, None, 3),
        ("Strength", None, "Core", None, None, 3),
        ("Athleticism", None, "Ladder drills", None, None, 4),
        ("Athleticism", None, "Cone drills", None, None, 4),
        ("Athleticism", None, "Shuttle runs", None, None, 4),
        ("Athleticism", None, "Reaction drills", None, None, 3),
        ("Film", None, "Transition offense", None, None, 2),
        ("Recovery", None, "Ice bath (optional)", None, None, 1),
        ("Recovery", None, "Long mobility", None, None, 3),
        ("Nutrition", None, "Calories", 3700, "kcal", 4),
        ("Nutrition", None, "Protein", 190, "g", 4),
        ("Nutrition", None, "Water", 5, "L", 3),
        ("Analytics", None, "Body weight", None, None, 2),
        ("Analytics", None, "Readiness", None, None, 2),
        ("Analytics", None, "Practice rating", None, None, 2),
        ("Mental", None, "Visualization", None, None, 3),
        ("Mental", None, "Journal", None, None, 2),
    ],
    "Thursday": [
        ("Basketball", "Shooting", "Form makes", 100, "makes", 5),
        ("Basketball", "Shooting", "Off-dribble", 100, "makes", 5),
        ("Basketball", "Shooting", "Catch-and-shoot", 200, "makes", 5),
        ("Basketball", "Shooting", "Movement", 100, "makes", 4),
        ("Basketball", "Shooting", "Game-speed threes", 100, "makes", 5),
        ("Basketball", "Shooting", "Free throws", 100, "makes", 4),
        ("Basketball", "Finishing", "Weak-hand finishing", None, None, 4),
        ("Strength", None, "Incline Bench", None, None, 5),
        ("Strength", None, "Pull-ups", None, None, 4),
        ("Strength", None, "Dumbbell Rows", None, None, 3),
        ("Strength", None, "Lateral Raises", None, None, 2),
        ("Strength", None, "Rear Delts", None, None, 2),
        ("Strength", None, "Arms", None, None, 2),
        ("Mental", None, "Visualization before every shooting segment", None, None, 4),
        ("Film", None, "Klay Thompson / Devin Booker breakdown", None, None, 2),
        ("Nutrition", None, "Calories", 3700, "kcal", 4),
        ("Nutrition", None, "Protein", 190, "g", 4),
        ("Nutrition", None, "Water", 5, "L", 3),
        ("Recovery", None, "Stretch", None, None, 3),
        ("Recovery", None, "Sleep 8+ hours", None, None, 4),
        ("Analytics", None, "Body weight", None, None, 2),
        ("Analytics", None, "Readiness", None, None, 2),
    ],
    "Friday": [
        ("Basketball", None, "Shooting under fatigue", None, None, 4),
        ("Basketball", None, "Competitive drills", None, None, 4),
        ("Basketball", None, "Transition finishing", None, None, 4),
        ("Basketball", None, "Defensive closeouts", None, None, 3),
        ("Strength", None, "Front Squat", None, None, 5),
        ("Strength", None, "Trap Bar Deadlift", None, None, 5),
        ("Strength", None, "Jump Squats", None, None, 4),
        ("Strength", None, "Sled Push", None, None, 3),
        ("Strength", None, "Hamstring work", None, None, 3),
        ("Strength", None, "Core", None, None, 3),
        ("Conditioning", None, "Court sprints", None, None, 4),
        ("Conditioning", None, "Deceleration drills", None, None, 3),
        ("Film", None, "Elite defenders breakdown", None, None, 2),
        ("Recovery", None, "Contrast shower", None, None, 2),
        ("Recovery", None, "Mobility", None, None, 3),
        ("Nutrition", None, "Calories", 3700, "kcal", 4),
        ("Nutrition", None, "Protein", 190, "g", 4),
        ("Nutrition", None, "Water", 5, "L", 3),
        ("Analytics", None, "Body weight", None, None, 2),
        ("Analytics", None, "Readiness", None, None, 2),
        ("Mental", None, "Visualization", None, None, 3),
    ],
    "Saturday": [
        ("Basketball", "Pregame", "Dynamic warm-up", None, None, 3),
        ("Basketball", "Pregame", "Activation", None, None, 3),
        ("Basketball", "Pregame", "Form shooting", None, None, 3),
        ("Basketball", "Pregame", "Ball handling", None, None, 3),
        ("Basketball", "Competition", "Game", None, None, 5),
        ("Basketball", "Competition", "Hustle grade", None, None, 2),
        ("Basketball", "Competition", "Shooting %", None, None, 2),
        ("Basketball", "Competition", "Turnovers", None, None, 2),
        ("Basketball", "Competition", "Assists", None, None, 2),
        ("Basketball", "Competition", "Rebounds", None, None, 2),
        ("Basketball", "Competition", "Defensive stops", None, None, 2),
        ("Recovery", "Postgame", "Stretch", None, None, 3),
        ("Nutrition", "Postgame", "Protein", None, None, 3),
        ("Recovery", "Postgame", "Recovery walk", None, None, 2),
        ("Film", None, "Upload game", None, None, 2),
        ("Film", None, "Self-review", None, None, 2),
        ("Journal", None, "Biggest success", None, None, 2),
        ("Journal", None, "Biggest lesson", None, None, 2),
    ],
    "Sunday": [
        ("Recovery", None, "Walk", 30, "min", 3),
        ("Recovery", None, "Stretch", None, None, 3),
        ("Recovery", None, "Foam roll", None, None, 3),
        ("Recovery", None, "Massage gun", None, None, 2),
        ("Recovery", None, "Mobility", None, None, 3),
        ("Analytics", "Health", "Weigh in", None, None, 3),
        ("Analytics", "Health", "Weekly photos", None, None, 1),
        ("Analytics", "Health", "Measure waist (optional)", None, None, 1),
        ("Analytics", "Health", "Pain check", None, None, 2),
        ("Analytics", None, "Weekly report", None, None, 2),
        ("Analytics", None, "Calories", None, None, 2),
        ("Analytics", None, "Protein average", None, None, 2),
        ("Analytics", None, "Sleep average", None, None, 2),
        ("Analytics", None, "Training hours", None, None, 2),
        ("Analytics", None, "Shooting totals", None, None, 2),
        ("Analytics", None, "Strength progress", None, None, 2),
        ("Analytics", "Recovery Score", "Readiness", None, None, 2),
        ("Analytics", "Recovery Score", "Motivation", None, None, 2),
        ("Analytics", "Recovery Score", "Stress", None, None, 2),
        ("Analytics", "Recovery Score", "Confidence", None, None, 2),
        ("Film", None, "Review your own footage", None, None, 2),
        ("Film", None, "Review one elite player", None, None, 2),
        ("Film", None, "Write next week's focus", None, None, 2),
        ("Life", "Planning", "Schedule workouts", None, None, 2),
        ("Life", "Planning", "Schedule classes", None, None, 1),
        ("Life", "Planning", "Meal prep", None, None, 2),
        ("Life", "Planning", "Grocery list", None, None, 1),
        ("Life", "Planning", "Set 3 weekly goals", None, None, 2),
        ("Journal", None, "Biggest win", None, None, 2),
        ("Journal", None, "Biggest mistake", None, None, 2),
        ("Journal", None, "What I learned", None, None, 2),
        ("Journal", None, "One thing to improve", None, None, 2),
    ],
}

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
