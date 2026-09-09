# Project Plan: GhostCharges — Recurring-Charge & Subscription Leak Detector

A full-stack tool that ingests a bank/card CSV export and uses SQL to detect 
recurring subscriptions, flag price creep, and surface forgotten charges — 
with a dashboard to explore the results, a thin AI narration layer, and a 
lightweight SaaS structure (auth + usage tiers).

**Name: GhostCharges** — "charges haunting your account," memorable, works 
as a headline ("I built GhostCharges to hunt down subscriptions I forgot I 
was paying for"). Check availability on GitHub/npm/domain before committing.

**Scope decision — AI stays secondary, SQL stays the star:**
AI categorization (having the LLM decide what a merchant *is*) was 
considered and dropped — it would move the actual intelligence out of SQL 
and into the model, undercutting the whole point of this project. AI is 
used only as a presentation layer on top of SQL's output, never as part of 
the detection logic itself. See Section 4a for the exact boundary.

---

## 1. Why this project (recap)

- Broad, relatable problem → shareable, star-friendly ("found $340/yr I was 
  wasting") 
- Genuinely full-stack: real schema design, an API, and a UI
- The core "wow" logic lives in SQL (window functions, LAG/LEAD, CTEs) — so 
  it still proves your SQL chops even though the headline is the outcome, 
  not the query

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Database | **PostgreSQL** | Best-in-class window functions, free tier on Railway/Supabase, industry standard |
| Backend | **Node.js + Express + TypeScript** | Matches full-stack JS ecosystem, pairs cleanly with React, easy to deploy |
| ORM/Query layer | **Raw SQL via `pg` / Prisma (schema only, raw SQL for the interesting queries)** | You want the SQL visible and reviewable, not hidden behind an ORM's abstraction — use Prisma just for migrations if you want type safety, but write the detection queries by hand |
| Frontend | **React + Vite + TypeScript + Tailwind CSS** | Fast to build, modern, standard for full-stack roles |
| Charts | **Recharts** | Simple, good-looking, easy dashboard charts |
| CSV parsing | **PapaParse** (frontend) or `csv-parse` (backend) | Handles messy real-world bank CSV exports |
| Auth | **Clerk or Auth.js** | Free tier, lets users save upload history, gives you a real "SaaS" talking point without building auth from scratch |
| AI narration | **Claude Haiku via Anthropic API** — one call per upload, on the *aggregated summary only*, never on raw transactions or detection logic | Cheapest model tier, near-zero cost if gated properly (see Section 4a), pure presentation layer — does not touch the SQL detection logic |
| Hosting | **Frontend: Vercel. Backend + DB: Railway or Render** | Both have generous free tiers, easy Postgres provisioning |

Stretch tech (only after MVP works, and only if it doesn't dilute the SQL 
story): fuzzy merchant-name matching library (e.g. Levenshtein-based), PDF 
export of the report, usage-tier limits (free vs unlimited AI summaries).

**Explicitly NOT doing:** AI-based merchant categorization or AI-driven 
detection logic. That work stays 100% in SQL (Section 4). This is a 
deliberate boundary, not an oversight — see the Scope Decision note above.

---

## 3. Database schema (first pass)

```sql
-- Raw imported transactions
CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    import_batch_id UUID NOT NULL,
    txn_date        DATE NOT NULL,
    merchant_raw    TEXT NOT NULL,
    merchant_norm   TEXT NOT NULL,   -- cleaned/normalized merchant name
    amount          NUMERIC(10,2) NOT NULL,
    category        TEXT,
    created_at      TIMESTAMP DEFAULT now()
);

-- Rule-based category keywords (seed data)
CREATE TABLE category_rules (
    id        SERIAL PRIMARY KEY,
    keyword   TEXT NOT NULL,
    category  TEXT NOT NULL
);

-- Cached/detected recurring subscriptions (populated by detection query)
CREATE TABLE detected_subscriptions (
    id                SERIAL PRIMARY KEY,
    import_batch_id   UUID NOT NULL,
    merchant_norm     TEXT NOT NULL,
    avg_amount        NUMERIC(10,2),
    interval_days     INT,           -- ~30, ~90, ~365 etc.
    occurrences       INT,
    first_seen        DATE,
    last_seen         DATE,
    price_increased   BOOLEAN DEFAULT FALSE,
    projected_annual  NUMERIC(10,2)
);

-- Auth (via Clerk/Auth.js — this table mirrors the external auth user)
CREATE TABLE users (
    id            UUID PRIMARY KEY,        -- matches auth provider's user id
    email         TEXT UNIQUE NOT NULL,
    plan          TEXT DEFAULT 'free',      -- 'free' | 'unlimited' (SaaS tier flag, no real billing needed for MVP)
    ai_calls_used INT DEFAULT 0,            -- resets monthly, used to gate AI summary generation
    created_at    TIMESTAMP DEFAULT now()
);

-- One row per upload's AI-generated narrative (cached, never regenerated for the same batch)
CREATE TABLE ai_summaries (
    id                SERIAL PRIMARY KEY,
    import_batch_id   UUID UNIQUE NOT NULL,  -- unique = enforces "one AI call per upload" at the DB level
    summary_text      TEXT NOT NULL,
    generated_at      TIMESTAMP DEFAULT now()
);
```

This will evolve once you're actually working with real CSV data — expect to 
adjust `merchant_norm` logic and add indexes once you see messy real bank 
data (e.g. "AMZN Mktp US*2K3F9" needs to normalize to "Amazon").

Note the `UNIQUE` constraint on `ai_summaries.import_batch_id` — that's a 
deliberate cost-control device, not just a data-integrity one: it makes it 
structurally impossible to accidentally fire the AI call twice for the same 
upload, even if there's a bug in the app logic above it.

---

## 4. The core SQL (the actual skill showcase)

These are the queries worth polishing and even writing about in your README 
or a blog post — this is what separates this project from a basic CRUD app.

**a) Detect recurring merchants** (same merchant, roughly regular intervals):
```sql
WITH ordered AS (
  SELECT
    merchant_norm,
    amount,
    txn_date,
    LAG(txn_date) OVER (PARTITION BY merchant_norm ORDER BY txn_date) AS prev_date
  FROM transactions
  WHERE import_batch_id = $1
),
gaps AS (
  SELECT
    merchant_norm,
    amount,
    txn_date,
    txn_date - prev_date AS gap_days
  FROM ordered
  WHERE prev_date IS NOT NULL
)
SELECT
  merchant_norm,
  COUNT(*) AS occurrences,
  ROUND(AVG(gap_days)) AS avg_interval_days,
  ROUND(AVG(amount), 2) AS avg_amount
FROM gaps
GROUP BY merchant_norm
HAVING COUNT(*) >= 2
   AND STDDEV(gap_days) < 5   -- consistent interval = likely subscription
ORDER BY avg_amount DESC;
```

**b) Price creep detection** (same merchant, amount increased over time):
```sql
SELECT
  merchant_norm,
  txn_date,
  amount,
  LAG(amount) OVER (PARTITION BY merchant_norm ORDER BY txn_date) AS prev_amount,
  amount - LAG(amount) OVER (PARTITION BY merchant_norm ORDER BY txn_date) AS increase
FROM transactions
WHERE import_batch_id = $1
QUALIFY increase > 0;  -- Postgres: wrap in a CTE + WHERE instead, QUALIFY isn't native to Postgres
```
(Claude Code will need to rewrite the last line as a wrapping CTE since 
`QUALIFY` is Snowflake/BigQuery syntax, not Postgres — good example of the 
kind of real debugging that makes this project legitimate.)

**c) Projected annual cost:**
```sql
SELECT
  merchant_norm,
  avg_amount,
  interval_days,
  ROUND(avg_amount * (365.0 / NULLIF(interval_days, 0)), 2) AS projected_annual
FROM detected_subscriptions
ORDER BY projected_annual DESC;
```

---

## 4a. The AI boundary — what it does and doesn't touch

This is worth reading carefully, since it's the difference between "AI-enhanced 
tool" (good) and "AI did the interesting part" (undercuts your SQL story).

**AI is called exactly once per upload, after all SQL detection is complete,** 
and only receives the *aggregated results* — never raw transactions, never 
involved in deciding what counts as a subscription or a price increase.

Example input to the model (this is all it ever sees):
```
Detected 6 recurring subscriptions totaling $1,847/year.
Categories: Streaming ($412/yr, 3 services), Software ($890/yr, 2 services), 
Fitness ($545/yr, 1 service).
Price increases detected: Netflix ($15.49 → $17.99, +16%), 
Adobe CC ($52.99 → $59.99, +13%).
```
The model's only job is to turn that into 2-3 readable sentences. It cannot 
change, override, or contribute to which subscriptions were detected — that 
was already decided entirely by the SQL in Section 4, before the model is 
ever called.

**Cost controls (why this stays close to free):**
1. **Model:** Claude Haiku — the cheapest tier, more than capable of turning 
   a short structured summary into a sentence.
2. **One call per upload, enforced at the DB level** via the `UNIQUE` 
   constraint on `ai_summaries.import_batch_id` (see schema above) — 
   re-viewing a past upload reads the cached row, never re-calls the API.
3. **Public demo mode uses a hardcoded, pre-written AI response** — zero 
   live API calls for anyone just browsing/trying the demo. Live AI calls 
   only happen for a real uploaded file.
4. **Per-user monthly cap** (`users.ai_calls_used`) — e.g. 10 free AI 
   summaries/month, resets monthly, gives you a real usage-tier/SaaS 
   mechanic without needing actual payments.
5. **Short, capped output** — cap the model's `max_tokens` low (this task 
   needs ~100-150 tokens, not more), so even a worst-case cost stays tiny.

Realistically: dozens to low hundreds of real users a month, gated like 
this, costs a few dollars at most on Haiku pricing.

---

## 5. Feature scope

**MVP (build this first, ship it, get it live):**
1. Upload a CSV (support common bank export formats — start with one format, generalize later)
2. Parse + normalize + store transactions
3. Run detection queries → populate `detected_subscriptions` (100% SQL, no AI)
4. Dashboard showing: total detected recurring spend, list of subscriptions with amounts/intervals, price-increase flags, projected annual cost, simple chart (spend by category)
5. One-click "public demo" mode using sample data + a hardcoded AI summary (no live API call, no auth required — this is what most visitors will actually try first)

**V1.5 — AI + SaaS layer (build right after MVP, before V2 polish):**
- Wire up the real AI summary call (Section 4a) for actual uploads
- Add auth (Clerk/Auth.js) + the `users` table
- Add the free-tier AI call cap
- Save upload history per logged-in user

**V2 (stretch, only after V1.5 is live and working):**
- Support multiple bank CSV formats automatically (auto-detect columns)
- Fuzzy merchant matching (so "NETFLIX.COM" and "Netflix" merge)
- Compare spending across multiple uploads over time
- Export report as PDF
- "Unused subscription" nudge (e.g., gym charged monthly but you also see zero related activity — this is a stretch/gimmick, optional)

Ship the MVP publicly before touching AI/auth, and ship AI/auth before 
touching V2. A live, working MVP beats a half-built feature-rich version 
every time — for stars, for interviews, for momentum.

---

## 6. Build phases (hand this to Claude Code)

Paste the prompt below into Claude Code. It's split into phases so you can 
run it across multiple sessions — say "let's do Phase 2" etc.

```
I'm building a full-stack project called [PROJECT NAME] — a tool that 
ingests a bank/card CSV export and uses SQL (window functions, CTEs) to 
detect recurring subscriptions, flag price increases over time, and show 
projected annual cost, with a dashboard UI.

Tech stack:
- PostgreSQL (raw SQL for detection queries, not hidden behind an ORM)
- Node.js + Express + TypeScript backend
- React + Vite + TypeScript + Tailwind frontend
- Recharts for charts
- PapaParse or csv-parse for CSV handling
- Clerk or Auth.js for auth (added after MVP, not in the first pass)
- Claude Haiku (Anthropic API) for a thin AI narration layer — one call per 
  upload, on aggregated results only, never involved in detection logic
- Deploy target: Vercel (frontend) + Railway (backend + Postgres)

IMPORTANT SCOPE BOUNDARY — the SQL detection logic (recurring-charge 
detection, price-creep detection, projected annual cost) must be 100% SQL, 
with zero AI involvement. AI is added later, strictly as a presentation 
layer that summarizes SQL's output in plain English after the fact. Do not 
let AI creep into merchant categorization, detection, or any decision-making 
logic — that's a deliberate boundary, not an oversight, since proving SQL 
skill is the actual point of this project.

I have a schema and core SQL queries already drafted (I'll paste them below). 
Work through this in phases, confirm with me before moving to the next phase, 
and explain what you're doing as you go since I need to be able to explain 
this project confidently in interviews.

[PASTE THE SCHEMA FROM SECTION 3 ABOVE]
[PASTE THE SQL QUERIES FROM SECTION 4 ABOVE]

PHASE 1 — SCAFFOLD
- Set up the repo structure: /backend and /frontend folders, or a monorepo — 
  your call, tell me which and why.
- Init backend: Express + TypeScript, connect to a local Postgres instance, 
  set up migrations for the schema above (use Prisma just for migrations if 
  it's convenient, or plain SQL migration files — your call).
- Init frontend: Vite + React + TypeScript + Tailwind, basic routing/layout.
- Set up .env handling for DB connection string, .gitignore, README stub.
- Get a "hello world" — backend running, frontend running, DB connected — 
  before moving on.

PHASE 2 — CSV IMPORT
- Build the upload endpoint: accept a CSV, parse it, normalize merchant 
  names (basic cleanup rules — strip trailing numbers/codes, uppercase 
  normalize, etc.), insert into `transactions` with a new import_batch_id.
- I'll provide a sample CSV (my own bank export, anonymized, or ask me to 
  find/generate a realistic sample dataset if I don't have one ready).
- Test the full path: upload → parse → rows in the DB.

PHASE 3 — DETECTION QUERIES
- Wire up the recurring-detection query, price-creep query, and projected 
  annual cost query against real imported data.
- Fix the QUALIFY-vs-Postgres issue in the price-creep query — rewrite it 
  properly as a wrapping CTE.
- Populate `detected_subscriptions` from the results.
- Sanity check the output against the sample data manually with me.

PHASE 4 — API LAYER
- Build endpoints: POST /upload, GET /subscriptions/:batchId, 
  GET /summary/:batchId (totals, category breakdown).
- Basic error handling and input validation.

PHASE 5 — DASHBOARD UI (MVP, no AI/auth yet)
- Build the upload page, the results dashboard: subscription list, 
  price-increase flags, total detected recurring spend, projected annual 
  cost, a chart of spend by category.
- Build a "try demo" mode using sample data + a hardcoded, pre-written AI 
  summary string (no live API call at all in demo mode).
- Keep the design clean — I want this to look genuinely presentable, not 
  like a bootcamp project. Ask me about styling preferences if useful, or 
  use sensible defaults.

PHASE 6 — DEPLOY MVP
- Help me deploy backend + Postgres to Railway, frontend to Vercel.
- Set up environment variables properly for production.
- Verify the live version works end to end with a fresh upload (real data, 
  no AI/auth yet — those come next phase).

PHASE 7 — AI SUMMARY + AUTH LAYER (only after MVP is live and confirmed working)
- Add the `users` and `ai_summaries` tables (already in the schema above).
- Wire up Clerk or Auth.js for login/signup.
- Add the real AI summary call: after detection queries finish for a real 
  (non-demo) upload, send ONLY the aggregated summary (counts, categories, 
  totals, price changes — never raw transactions) to Claude Haiku, cache 
  the result in `ai_summaries`, and display it on the dashboard.
- Enforce the UNIQUE constraint behavior — re-viewing a past upload must 
  read the cached summary, never re-call the API.
- Add the monthly free-tier cap on `users.ai_calls_used` (e.g. 10/month) 
  and a simple "upgrade" UI state (doesn't need real billing — just the 
  tier flag and a clear message when the cap is hit).
- Cap the model's max_tokens low (~150) since this is a short summary task.
- Confirm with me that the AI call only ever touches aggregated data, never 
  detection logic, before marking this phase done.

PHASE 8 — README + POLISH
- Write a strong README: what it does, why (the problem it solves), tech 
  stack, screenshot/GIF placeholder, live demo link, how to run locally, 
  and a clear "How it works" section that leads with the SQL detection 
  engine (window functions, LAG, CTEs) as the core, with the AI summary 
  described afterward as a secondary presentation feature — not the 
  headline. This ordering matters for how the project reads to reviewers.
- Add a LICENSE.
- Suggest 2-3 small polish items (loading states, empty states, mobile 
  responsiveness) if anything's rough.

RULE THROUGHOUT: never let AI logic substitute for or override SQL 
detection logic. If you ever find yourself tempted to solve a detection 
or categorization problem with an LLM call instead of a SQL query, stop 
and flag it to me first — that would defeat the actual point of this 
project.

Let's start with Phase 1. Ask me anything you need before scaffolding.
```

---

## 7. After it's built — the part that actually gets stars

Building it is maybe 60% of the outcome. To actually get traction:
1. **Get a sample/demo mode** — let people try it with fake sample data 
   without needing to upload their real bank statement (privacy concerns 
   will kill adoption otherwise). This matters a lot.
2. **Write one solid post about it** — "I built a tool that found $340/year 
   in forgotten subscriptions" on Reddit (r/personalfinance crossover angle, 
   or r/webdev/r/SideProject for the build story), dev.to, or a LinkedIn post 
   with a screenshot. The story ("here's what it found in my own data") is 
   more shareable than "I built a CRUD app."
3. **Show HN** if it's genuinely polished — this audience rewards clever, 
   useful tools and can send a real spike of stars/traffic if it lands.
4. Mention the privacy angle explicitly wherever you share it (no data 
   stored/sent anywhere, processed and discarded, or clearly stated if you 
   do store it) — people are cautious about uploading financial data, and 
   addressing it upfront builds trust.

Sharing is on you — no tool does this part. But a good demo mode and one 
well-written post is usually enough to get the first real wave of attention.


