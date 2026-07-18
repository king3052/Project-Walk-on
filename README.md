# Project Walk-On OS

> "Become the best basketball player you can possibly become through
> deliberate practice, data, and discipline."

A personal high-performance operating system: strength training,
basketball skill work, nutrition, recovery, and analytics in one dashboard.

## Status
**v0.1 — Foundation.** Dashboard shell, database schema, and core API
routes are scaffolded. Not yet deployed or connected to a live database.

## Stack
Next.js + TypeScript + Tailwind (frontend) · FastAPI + PostgreSQL (backend)
· Recharts (analytics)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full layout and
local dev setup, and [`docs/PRD.md`](docs/PRD.md) for product scope.

## Quickstart
```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# frontend (new terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000` for the dashboard (runs on mock data until
a database + user id are wired up) and `http://localhost:8000/docs` for
the interactive API docs.

## Roadmap
- [x] Repo structure, schema, dashboard shell, core API routes
- [ ] Auth (Supabase Auth)
- [ ] Workout + shooting + nutrition + recovery logging UI
- [ ] Analytics charts (Recharts)
- [ ] Weekly review flow
- [ ] Film room (upload + tagging)
- [ ] v2: wearables, AI video breakdown, coach portal
