# Architecture — v0.1

## Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** FastAPI (Python), SQLAlchemy ORM
- **Database:** PostgreSQL (Supabase recommended — gives you Postgres
  hosting + auth in one place for a solo project)
- **Charts:** Recharts
- **Deployment:** Vercel (frontend), Railway or Render (backend)

## Repo layout
```
project-walk-on/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, router registration, startup
│   │   ├── core/
│   │   │   └── database.py    # engine, session, Base
│   │   ├── models/
│   │   │   └── models.py      # SQLAlchemy tables
│   │   ├── schemas/
│   │   │   └── schemas.py     # Pydantic request/response models
│   │   └── routers/
│   │       ├── users.py
│   │       ├── training.py    # sessions + strength logs + 1RM/PR logic
│   │       ├── shooting.py
│   │       ├── nutrition.py
│   │       ├── recovery.py
│   │       ├── goals.py
│   │       └── dashboard.py   # aggregate read model for the dashboard
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # dashboard
│   │   └── globals.css
│   ├── components/
│   │   ├── StatCard.tsx
│   │   └── Mission.tsx
│   ├── lib/api.ts             # typed fetch client for the backend
│   └── package.json
└── docs/
    ├── PRD.md
    └── ARCHITECTURE.md
```

## Data model (v0.1)
- `users` — one row per athlete (email, name, height, weight, position,
  dominant hand)
- `athlete_profiles` — 1:1 with users; vertical, wingspan, body fat, goal
  numbers
- `training_sessions` — one row per logged session (date, type, notes);
  `type` is one of STRENGTH / BASKETBALL / CONDITIONING / RECOVERY / FILM
- `strength_logs` — belongs to a session; exercise/sets/reps/weight, plus
  computed `estimated_1rm` and `is_pr` flag
- `shooting_logs` — per user, per date; shot_type/attempts/makes/location,
  `percentage` computed on read
- `nutrition_logs` — per user, per date; calories/protein/carbs/fat/water
- `recovery_logs` — per user, per date; sleep/energy/stress/soreness
- `goals` — per user; title/category/target/deadline/status

Every table keys off `user_id`, so the schema already supports multiple
athletes even though v0.1 only has one.

## Athlete score (dashboard)
For v0.1 this is intentionally simple: an average of (a) bench progress
toward goal, (b) squat progress toward goal, and (c) this week's shooting
percentage — each capped at 100%. This is a placeholder formula, meant to
be replaced once there's a real opinion on how to weight strength vs.
skill vs. recovery.

## Auth
Not wired up yet in this pass. Recommended: Supabase Auth, since it also
hosts the Postgres database — one account, one dashboard, less to manage
for a solo project. `NEXT_PUBLIC_DEMO_USER_ID` is a placeholder env var so
the dashboard can render against a real user before auth exists.

## Local dev
**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DATABASE_URL
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
