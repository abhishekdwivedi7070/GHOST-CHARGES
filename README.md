# GhostCharges

A full-stack tool that ingests a bank/card CSV export and uses **SQL** (window
functions, `LAG`, CTEs) to detect recurring subscriptions, flag price creep, and
surface forgotten charges.

AI is a later, optional narration layer on top of SQL results. It is not part of
detection. See `plan.md` and `phases.md`.

## Status

Phase 2: CSV import works. Detection queries and the dashboard come next.

## CSV format

One bank export format for now. Header row required:

```
date,description,amount
2026-01-05,NETFLIX.COM,17.99
```

- `date`: `YYYY-MM-DD` (also accepts `M/D/YYYY`)
- `description`: merchant as the bank printed it
- `amount`: charge amount (signs and `$` are stripped; stored as a positive number)
- `category` is optional; otherwise we match `category_rules` keywords

Download a realistic sample from `GET /sample.csv` or the Upload page.

## Tech stack

| Layer | Choice |
|---|---|
| Database | PostgreSQL 16 (Docker) |
| Backend | Node.js + Express + TypeScript |
| Queries | Raw SQL via `pg` (Prisma for migrations only) |
| Frontend | React + Vite + TypeScript + Tailwind CSS |

## Local setup

**Requirements:** Node 20+, Docker Desktop.

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install dependencies
npm install
npm install --prefix backend
npm install --prefix frontend

# 3. Apply schema + seed category rules
npm run db:migrate
npm run db:seed

# 4. Run API (http://localhost:3001) and UI (http://localhost:5173)
npm run dev
```

Copy `backend/.env.example` to `backend/.env` if it is not already there.
Postgres is mapped to **55432** so it does not collide with a local install on 5432/5433.

The home page should show **API connected** and **Postgres connected**.

## Project layout

```
backend/     Express API, Prisma migrations, raw SQL via pg
frontend/    Vite + React UI
plan.md      Product and technical plan
phases.md    Execution phases
```
