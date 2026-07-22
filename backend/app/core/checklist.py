"""
Your preset weekly template. Each entry is (category, task). "Seed this
week" (POST /scheduled-workouts/seed-week) turns this into real
ScheduledWorkout rows on the calendar for a given week, skipping any
day/task that's already there so it's safe to run more than once.

mark_category_done() is called by the various logging routers right after
a real log is saved — it checks off any not-yet-completed scheduled items
in that category for that date, so you're not re-checking boxes for
things you already logged elsewhere in the app.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session

BASKETBALL_WEEKLY_TEMPLATE: dict[str, list[tuple[str, str]]] = {
    "Monday": [
        ("Basketball", "Dynamic warm-up"),
        ("Basketball", "Ball handling (15 min)"),
        ("Basketball", "Form shooting (100 makes)"),
        ("Basketball", "Catch-and-shoot (200 makes)"),
        ("Basketball", "Game-speed threes (100 makes)"),
        ("Basketball", "Finishing package (100 reps)"),
        ("Basketball", "Free throws (50)"),
        ("Strength", "Back Squat"),
        ("Strength", "Bulgarian Split Squat"),
        ("Strength", "Romanian Deadlift"),
        ("Strength", "Box Jumps"),
        ("Strength", "Core work"),
        ("Conditioning", "10 x 20m sprints"),
        ("Conditioning", "Mobility cooldown"),
        ("Nutrition", "3,500 kcal"),
        ("Nutrition", "180g protein"),
        ("Nutrition", "450g carbs"),
        ("Nutrition", "80g fat"),
        ("Nutrition", "4L water"),
        ("Recovery", "Stretch (15 min)"),
        ("Recovery", "Foam roll"),
        ("Recovery", "Mobility"),
        ("Recovery", "Sleep 8+ hours"),
        ("Film", "20 min of an elite shooting guard"),
        ("Film", "Record 3 observations"),
        ("Analytics", "Log workout"),
        ("Analytics", "Log body weight"),
        ("Analytics", "Log energy"),
        ("Analytics", "Log soreness"),
        ("Goals", "Review long-term goals"),
        ("Goals", "Update progress"),
        ("Mental", "Visualization (10 min)"),
        ("Mental", "Journal"),
        ("Life", "Finish assignments"),
        ("Life", "Calendar review"),
    ],
    "Tuesday": [
        ("Basketball", "Ball handling"),
        ("Basketball", "Spot-up shooting"),
        ("Basketball", "Pull-up shooting"),
        ("Basketball", "Free throws"),
        ("Strength", "Bench Press"),
        ("Strength", "Pull-ups"),
        ("Strength", "Rows"),
        ("Strength", "Shoulder press"),
        ("Strength", "Face pulls"),
        ("Conditioning", "Bike intervals"),
        ("Recovery", "Stretch"),
        ("Film", "Defensive rotations"),
        ("Analytics", "Log everything"),
    ],
    "Wednesday": [
        ("Basketball", "Live dribble work"),
        ("Basketball", "Finishing"),
        ("Basketball", "Midrange"),
        ("Basketball", "Pick-and-roll reads"),
        ("Strength", "Olympic lift variation"),
        ("Strength", "Jump training"),
        ("Strength", "Single-leg strength"),
        ("Conditioning", "Shuttle runs"),
        ("Recovery", "Ice bath (optional)"),
        ("Recovery", "Mobility"),
    ],
    "Thursday": [
        ("Basketball", "500 makes"),
        ("Basketball", "Weak-hand finishing"),
        ("Basketball", "Floaters"),
        ("Strength", "Incline Bench"),
        ("Strength", "Pull-ups"),
        ("Strength", "DB Rows"),
        ("Strength", "Lateral Raises"),
        ("Strength", "Arms"),
    ],
    "Friday": [
        ("Basketball", "Shooting under fatigue"),
        ("Basketball", "Transition finishing"),
        ("Basketball", "Competitive drills"),
        ("Strength", "Front Squat"),
        ("Strength", "Trap Bar Deadlift"),
        ("Strength", "Jump Squats"),
        ("Strength", "Sled Push"),
        ("Conditioning", "Court sprints"),
    ],
    "Saturday": [
        ("Basketball", "Pickup games"),
        ("Basketball", "Scrimmage"),
        ("Basketball", "Competitive shooting"),
        ("Conditioning", "Light cardio"),
        ("Recovery", "Long mobility session"),
        ("Film", "Analyze your own game footage"),
    ],
    "Sunday": [
        ("Recovery", "Walk"),
        ("Recovery", "Stretch"),
        ("Recovery", "Mobility"),
        ("Recovery", "Massage gun"),
        ("Analytics", "Weekly report"),
        ("Analytics", "Weight trend"),
        ("Analytics", "Calories"),
        ("Analytics", "Strength progress"),
        ("Analytics", "Shooting %"),
        ("Planning", "Plan next week"),
        ("Planning", "Meal prep"),
        ("Planning", "Schedule workouts"),
        ("Journal", "Weekly reflection"),
        ("Journal", "Wins"),
        ("Journal", "Areas to improve"),
    ],
}

TENNIS_WEEKLY_TEMPLATE: dict[str, list[tuple[str, str]]] = {
    "Monday": [
        ("Serve", "Dynamic warm-up + shadow serves"),
        ("Serve", "Toss consistency (20 reps)"),
        ("Serve", "Flat serve — 50 reps"),
        ("Serve", "Kick/slice serve — 50 reps"),
        ("Groundstrokes", "Forehand cross-court — 15 min"),
        ("Groundstrokes", "Backhand cross-court — 15 min"),
        ("Footwork", "Ladder + cone footwork circuit"),
        ("Strength & Conditioning", "Lower body strength session"),
        ("Strength & Conditioning", "Core work"),
        ("Nutrition", "3,000+ kcal"),
        ("Nutrition", "150g protein"),
        ("Nutrition", "Hydration — 3L water"),
        ("Recovery", "Stretch (15 min)"),
        ("Recovery", "Sleep 8+ hours"),
        ("Film", "Watch 20 min of an elite player's footwork"),
        ("Analytics", "Log practice session"),
        ("Analytics", "Log body weight"),
        ("Goals", "Review long-term goals"),
        ("Mental", "Visualization (10 min)"),
        ("Mental", "Journal"),
        ("Life", "Finish assignments"),
        ("Life", "Calendar review"),
    ],
    "Tuesday": [
        ("Groundstrokes", "Forehand down-the-line — 15 min"),
        ("Groundstrokes", "Backhand down-the-line — 15 min"),
        ("Footwork", "Split-step + recovery drills"),
        ("Strength & Conditioning", "Upper body strength session"),
        ("Recovery", "Stretch"),
        ("Film", "Review own match footage"),
        ("Analytics", "Log everything"),
    ],
    "Wednesday": [
        ("Serve", "Serve placement — targets"),
        ("Groundstrokes", "Live rally — cross-court consistency"),
        ("Footwork", "Sprint + change-of-direction conditioning"),
        ("Strength & Conditioning", "Explosive/plyometric work"),
        ("Recovery", "Mobility session"),
    ],
    "Thursday": [
        ("Groundstrokes", "Approach shots + volleys"),
        ("Groundstrokes", "Overheads"),
        ("Strength & Conditioning", "Full body strength session"),
        ("Footwork", "Agility ladder circuit"),
    ],
    "Friday": [
        ("Serve", "Second serve consistency under pressure"),
        ("Groundstrokes", "Return of serve practice"),
        ("Footwork", "Court coverage drills"),
        ("Strength & Conditioning", "Speed/agility session"),
    ],
    "Saturday": [
        ("Groundstrokes", "Match play / practice sets"),
        ("Footwork", "Match-intensity movement"),
        ("Recovery", "Long mobility session"),
        ("Film", "Analyze your own match footage"),
    ],
    "Sunday": [
        ("Recovery", "Walk"),
        ("Recovery", "Stretch"),
        ("Recovery", "Mobility"),
        ("Analytics", "Weekly report"),
        ("Analytics", "Weight trend"),
        ("Analytics", "First-serve percentage trend"),
        ("Planning", "Plan next week"),
        ("Planning", "Schedule court time"),
        ("Journal", "Weekly reflection"),
        ("Journal", "Wins"),
        ("Journal", "Areas to improve"),
    ],
}

TEMPLATES_BY_SPORT = {
    "Basketball": BASKETBALL_WEEKLY_TEMPLATE,
    "Tennis": TENNIS_WEEKLY_TEMPLATE,
}

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def seed_week(db: Session, models, user_id: str, week_start: date, sport: str = "Basketball") -> int:
    """Creates ScheduledWorkout rows for week_start..week_start+6 from the template
    matching the athlete's sport. Skips any (date, title) pair that already exists,
    so it's safe to call repeatedly."""
    template = TEMPLATES_BY_SPORT.get(sport, BASKETBALL_WEEKLY_TEMPLATE)
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
        for category, task in template.get(weekday_name, []):
            if (day, task) in existing:
                continue
            db.add(
                models.ScheduledWorkout(
                    user_id=user_id, date=day, workout_type=category, title=task
                )
            )
            created += 1
    db.commit()
    return created


def mark_category_done(db: Session, models, user_id: str, log_date: date, categories: list[str]) -> None:
    """Checks off any not-yet-completed scheduled items in these categories for this date."""
    (
        db.query(models.ScheduledWorkout)
        .filter(
            models.ScheduledWorkout.user_id == user_id,
            models.ScheduledWorkout.date == log_date,
            models.ScheduledWorkout.workout_type.in_(categories),
            models.ScheduledWorkout.completed.is_(False),
        )
        .update({"completed": True}, synchronize_session=False)
    )
    db.commit()
