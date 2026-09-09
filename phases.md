# GhostCharges — Execution Phases

How we will build the plan in `plan.md`, in order. Each phase is a self-contained
chunk of work. Finish one, confirm it works, then start the next.

**Hard rule for every phase:** recurring detection, price-creep detection, and
projected annual cost are 100% SQL. AI never categorizes merchants, never decides
what is a subscription, and never overrides SQL results. If a detection problem
starts looking like an LLM job, stop and keep it in SQL.

**Ship order (do not skip ahead):**
1. Scaffold → import → SQL detection → API → dashboard → **live MVP**
2. Then AI narration + auth (V1.5)
3. Then README / polish
4. Then V2 stretch — only after V1.5 is live

---

## Phase 0 — Preconditions

**Goal:** Have everything needed so Phase 1 can start without guessing.

**Consists of:**
- Confirm project name **GhostCharges** (GitHub / npm / domain availability is a
  later check, not a blocker).
- Local PostgreSQL available (or a decision to use Docker Postgres).
- A sample bank/card CSV ready, or agreement to generate a realistic sample in
  Phase 2.
- Anthropic / Clerk accounts are **not** required until Phase 7.

**Done when:**
- You can start scaffolding without open product questions.

---

## Phase 1 — Scaffold

**Goal:** Empty but real full-stack skeleton: backend, frontend, and Postgres
talking to each other.

**Consists of:**
- Repo layout: `/backend` + `/frontend` (separate apps, simple deploy later).
- Backend: Node.js + Express + TypeScript, `pg` for queries.
- Migrations for first-pass schema from `plan.md` Section 3:
  - `transactions`
  - `category_rules`
  - `detected_subscriptions`
  - Hold `users` and `ai_summaries` until Phase 7 (they exist in the plan schema
    but are unused until auth/AI).
- Prisma **only** for migrations if useful; detection queries stay raw SQL.
- Frontend: Vite + React + TypeScript + Tailwind, basic layout + routing stub.
- `.env` for `DATABASE_URL`, `.gitignore`, README stub.
- Seed a tiny `category_rules` table (keyword → category) so later category
  charts have something to join against.

**Out of scope:** CSV upload, detection queries, auth, AI, deploy.

**Done when:**
- Backend starts and hits Postgres successfully.
- Frontend starts and shows a shell page.
- Schema is applied locally.
- No feature work yet — just "hello world" + DB connected.

---

## Phase 2 — CSV Import

**Goal:** One reliable path: file in → normalized rows in `transactions`.

**Consists of:**
- `POST /upload` that accepts a CSV (start with **one** bank export format).
- Parse with `csv-parse` on the backend (keeps messy CSV off the browser for MVP).
- Assign a new `import_batch_id` (UUID) per upload.
- Merchant normalization (rule-based, not AI):
  - trim, uppercase
  - strip trailing codes / order IDs (e.g. `AMZN MKTP US*2K3F9` → `AMAZON`)
  - collapse extra whitespace / punctuation
- Map CSV columns → `txn_date`, `merchant_raw`, `amount` (and `category` if present).
- Apply `category_rules` keyword match to fill `category` when possible.
- Insert rows into `transactions`.
- Provide or generate a realistic sample CSV (recurring merchants, at least one
  price increase, mixed one-off charges).

**Out of scope:** Detection queries, dashboard, multi-bank auto-detect, fuzzy matching.

**Done when:**
- Uploading the sample CSV creates a batch and inserts rows.
- `merchant_norm` looks sane on messy names.
- You can query `transactions` in Postgres and see the import.

---

## Phase 3 — Detection Queries (the SQL showcase)

**Goal:** Prove the product: SQL finds subscriptions, price creep, and annual cost.

**Consists of:**
- Recurring-merchant query (window `LAG`, gap days, `STDDEV` consistency).
- Price-creep query rewritten for Postgres (wrap in a CTE + `WHERE`, no `QUALIFY`).
- Projected annual cost: `avg_amount * (365.0 / interval_days)`.
- After a successful import, run detection and **upsert** `detected_subscriptions`
  for that `import_batch_id`.
- Persist: `avg_amount`, `interval_days`, `occurrences`, `first_seen`, `last_seen`,
  `price_increased`, `projected_annual`.
- Manually sanity-check results against the sample CSV (known Netflix / gym /
  software rows should appear; one-offs should not).

**Out of scope:** Polished API contract, UI, AI, auth.

**Done when:**
- Detection is 100% SQL, no model involved.
- `detected_subscriptions` matches a manual read of the sample data.
- Price increases are flagged correctly.
- Projected annual figures are explainable from interval + amount.

---

## Phase 4 — API Layer

**Goal:** Stable HTTP surface the dashboard can call.

**Consists of:**
- `POST /upload` — parse, store, run detection, return `import_batch_id`.
- `GET /subscriptions/:batchId` — list from `detected_subscriptions`.
- `GET /summary/:batchId` — totals, category breakdown, price-increase count,
  projected annual total.
- Input validation (file type, required columns, batch id format).
- Clear error responses (bad CSV, unknown batch, empty file).
- Do **not** call Anthropic here. Demo/hardcoded copy comes in Phase 5.

**Out of scope:** Auth, AI, usage caps, frontend polish.

**Done when:**
- Upload → detect → fetch subscriptions/summary works via HTTP (curl or similar).
- Errors fail cleanly instead of 500s with no message.

---

## Phase 5 — Dashboard UI (MVP, no AI/auth)

**Goal:** A presentable product people can try without logging in.

**Consists of:**
- Upload page: drop/select CSV, loading + error states.
- Results dashboard for a batch:
  - total detected recurring spend
  - subscription list (amount, interval, occurrences, first/last seen)
  - price-increase flags
  - projected annual cost
  - Recharts chart: spend by category
- **Try demo** mode:
  - sample dataset (same as Phase 2 sample, or a seeded demo batch)
  - hardcoded, pre-written "AI" summary string
  - **zero** live API calls, **no** auth required
- Clean, interview-presentable UI (sensible defaults: dark/neutral, tight
  typography, not a default Vite template).

**Out of scope:** Clerk/Auth.js, live Haiku calls, PDF export, multi-upload compare.

**Done when:**
- A visitor can click Demo and see a full dashboard.
- A real CSV upload shows the same dashboard from live SQL results.
- Demo never hits Anthropic.

---

## Phase 6 — Deploy MVP

**Goal:** Public live URL. This is the first "it's real" milestone.

**Consists of:**
- Backend + Postgres on Railway (or Render).
- Frontend on Vercel.
- Production env vars (`DATABASE_URL`, CORS origin, etc.).
- Run migrations on the production DB.
- Seed demo data / sample CSV so "Try demo" works on the live site.
- End-to-end check: fresh real upload on production (no AI, no auth).

**Out of scope:** Auth, live AI, usage tiers, V2 features.

**Done when:**
- Live frontend talks to live API + live Postgres.
- Demo mode works for a stranger.
- A fresh CSV upload works on production.

---

## Phase 7 — AI Summary + Auth (V1.5)

**Goal:** Thin SaaS layer on top of a working MVP. SQL still owns detection.

**Only start after Phase 6 is live and confirmed.**

**Consists of:**
- Add `users` and `ai_summaries` tables (migrations).
- Auth via Clerk or Auth.js; `users.id` matches the auth provider user id.
- After detection on a **real** (non-demo) upload, build an **aggregated**
  payload only — counts, categories, totals, price changes. Never raw
  transactions. Never detection decisions.
- One Claude Haiku call, `max_tokens` ~150, 2–3 sentences.
- Insert into `ai_summaries` (`import_batch_id` UNIQUE). Re-view = read cache,
  never re-call the API.
- Monthly free-tier cap: `users.ai_calls_used` (e.g. 10/month), `plan`
  `free` | `unlimited`. Cap-hit UI, no real billing.
- Demo mode stays hardcoded — still zero live AI for browsers.
- Save upload history for logged-in users.

**Out of scope:** Real payments, AI categorization, changing SQL results with AI.

**Done when:**
- Demo still uses the hardcoded summary.
- Real upload: one Haiku call on aggregates only, then cache.
- Reopening the same batch does not call Haiku again.
- Free-tier cap blocks extra AI summaries with a clear upgrade message.
- You can point at the code and prove AI never touches detection.

---

## Phase 8 — README + Polish

**Goal:** The repo reads like a product + a SQL skill showcase.

**Consists of:**
- README:
  - what it does and why
  - tech stack
  - screenshot / GIF placeholder
  - live demo link
  - local run instructions
  - **How it works** led by SQL (window functions, `LAG`, CTEs); AI described
    after as a presentation layer, not the headline
- LICENSE.
- Small polish pass: loading states, empty states, mobile layout if rough.
- Privacy note: what is stored, what is not, demo vs real upload.

**Out of scope:** New product features, V2 items.

**Done when:**
- A stranger can clone, run locally, and understand the SQL-first story
  from the README alone.

---

## Phase 9 — V2 Stretch (optional, after V1.5 is live)

**Goal:** Extra depth without diluting the SQL story. Pick 1–2, not all at once.

**Consists of (each is its own mini-phase if you take it on):**
- Auto-detect multiple bank CSV column formats.
- Fuzzy merchant matching (Levenshtein) so `NETFLIX.COM` and `Netflix` merge —
  still not AI categorization.
- Compare spend across multiple uploads over time.
- PDF export of the report.
- Usage-tier limits that also gate AI summaries more formally.
- Optional "unused subscription" nudge (gimmick; skip unless the rest is solid).

**Done when:**
- The chosen stretch item is live and does not replace SQL detection with AI.

---

## After the build (not a coding phase)

From `plan.md` Section 7 — do this yourself once Phase 6+ is live:

1. Demo mode is the default path (privacy kills adoption otherwise).
2. One solid post: what it found in real/sample data, not "I built a CRUD app."
3. Show HN only if the UI is actually polished.
4. State the privacy story up front everywhere you share it.

---

## Phase checklist

| Phase | Name | Ships? | AI? | Auth? |
|---|---|---|---|---|
| 0 | Preconditions | — | No | No |
| 1 | Scaffold | Local hello world | No | No |
| 2 | CSV import | Local import path | No | No |
| 3 | Detection queries | SQL engine | No | No |
| 4 | API layer | HTTP contract | No | No |
| 5 | Dashboard UI | Local MVP | Hardcoded demo only | No |
| 6 | Deploy MVP | **Public MVP** | Hardcoded demo only | No |
| 7 | AI + auth | **V1.5 live** | Haiku on aggregates | Yes |
| 8 | README + polish | Repo ready to share | Unchanged | Unchanged |
| 9 | V2 stretch | Optional extras | Still not detection | Already in |

Next action: **Phase 1 — Scaffold.**
