# Project Walk-On OS — Product Requirements (v0.1)

## Vision
A personal high-performance operating system combining strength training,
basketball skill work, nutrition, recovery, and analytics — helping one
athlete (Kanishk) improve through daily data and deliberate practice.

## MVP question
"Can Kanishk wake up every day, know exactly what to do, execute it, and see
measurable improvement?" If yes, the MVP has done its job.

## MVP scope (this build)
1. **Athlete Dashboard** — current status at a glance: body, strength,
   basketball, recovery, athlete score.
2. **Today's Mission** — daily checklist across lift / shoot / film /
   nutrition / recovery, with a completion score.
3. **Workout Tracker** — strength sets/reps/weight with automatic estimated
   1RM (Epley formula) and PR detection; basketball shooting logs
   (attempts/makes/% by shot type and location).
4. **Nutrition Tracker** — manual entry: calories, protein, carbs, fat, water.
5. **Recovery Tracker** — sleep, energy, stress, soreness.
6. **Analytics** — weight / strength / shooting trends over time (Recharts).
7. **Weekly Review** — Sunday reflection: wins, weaknesses, next focus.

## Out of scope for v0.1 (planned for v2)
- Apple Health / Garmin / wearable integration
- AI video breakdown of film
- Shot chart visualization (court heat map)
- Coach portal / team mode
- Injury tracking
- Automatic AI-generated weekly review (v0.1 is manual reflection first,
  automate once there's enough real data to summarize)

## Build philosophy
Hybrid approach: optimize first for daily personal use, but structure the
data model (per-`user_id` on every table) so it could support multiple
athletes later without a rewrite.

## Success metric for v0.1
Kanishk logs a workout, a shooting session, nutrition, and recovery data
for 7 consecutive days, and the dashboard reflects real numbers instead of
mock data.
