# Artha — Architecture Document

> System design, data model, module responsibilities, runtime topology, and deployment strategy.

---

## 1. Architectural Principles

Artha is built around four non-negotiable principles:

1. **LLMs do not make financial decisions.** Every number on the dashboard is produced by pure TypeScript. The AI layer is a *narrative shell* around a deterministic core.
2. **Same inputs → same outputs, always.** No hidden state, no implicit auto-recompute. The user explicitly triggers computation.
3. **Security by default.** Row-Level Security on every Supabase table; secrets never in the repo; strong validation at every API boundary.
4. **Composable modules.** `profiling → allocation → selector → ranking → monte_carlo` are independent units; each can be swapped or tested in isolation.

---

## 2. High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                              │
│                                                                     │
│  ┌──────────────────────────┐    ┌──────────────────────────────┐   │
│  │  Next.js App Router UI   │    │    Web Worker                │   │
│  │  (React 18 + TS)         │◄──►│    monte_carlo.ts            │   │
│  │  - Dashboard             │    │    (10,000 simulations)      │   │
│  │  - Beginner wizard       │    └──────────────────────────────┘   │
│  │  - Register / Login      │                                       │
│  │  - Profile               │    LocalStorage                       │
│  │                          │    - Beginner profile                 │
│  │  Recharts / React Flow   │    - Saved plans (max 2)              │
│  └────────────┬─────────────┘                                       │
└───────────────┼─────────────────────────────────────────────────────┘
                │ HTTPS (fetch)
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (Vercel Edge)                       │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                   API ROUTE HANDLERS                          │  │
│  │                                                               │  │
│  │  /api/auth/lookup            /api/portfolio/build             │  │
│  │  /api/auth/register-profile  /api/simulation/run              │  │
│  │  /api/onboarding/chat        /api/explain (streaming)         │  │
│  │  /api/profile/compute        /api/ips/generate                │  │
│  │  /api/copilot/chat           /api/inngest                     │  │
│  └──────┬──────────────────────────────┬─────────────────────────┘  │
│         │                              │                            │
│         ▼                              ▼                            │
│  ┌──────────────────────┐   ┌──────────────────────────────────┐    │
│  │  DETERMINISTIC CORE  │   │    NARRATIVE SHELL (LLM)         │    │
│  │  lib/core/*.ts       │   │    lib/ai/*                      │    │
│  │  - profiling         │   │    - goal extraction             │    │
│  │  - allocation        │   │    - explanation                 │    │
│  │  - selector          │   │    - copilot                     │    │
│  │  - ranking           │   │                                  │    │
│  │  - monte_carlo       │   └────────────────┬─────────────────┘    │
│  │  - target_planning   │                    │                      │
│  │  - diversification   │                    ▼                      │
│  │  - compliance (IPS)  │   ┌──────────────────────────────────┐    │
│  └──────────┬───────────┘   │    OpenAI / Anthropic APIs       │    │
│             │               └──────────────────────────────────┘    │
└─────────────┼───────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                          │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  users   │ │ profiles │ │  goals   │ │portfolios│ │simulation│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ sessions │ │amfi_schem│ │ nav_history  │ │behavior_events│       │
│  └──────────┘ └──────────┘ └──────────────┘ └──────────────┘        │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │ chat_memory  │   ← pgvector extension for AI memory              │
│  └──────────────┘                                                   │
│                                                                     │
│  Row-Level Security + Supabase Auth on every table.                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Frontend

| Layer | Tech | Role |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Pages, routing, server actions, API routes |
| UI library | **React 18** | Component model, reactive updates |
| Language | **TypeScript (strict)** | Type safety across all boundaries |
| Styling | **Custom CSS variables + Tailwind-style utilities** | Corex-inspired light/dark theme |
| Charts | **Recharts** | Line, scatter, comparison charts |
| Graph | **React Flow** | Interactive Goal → Risk → Allocation → Funds → Simulation canvas |
| Animation | **CSS keyframes** | Panel fade-in, button hover |

### 3.2 Backend (in-process with Next.js)

| Concern | Tech |
|---|---|
| API handlers | Next.js Route Handlers (`app/api/**/route.ts`) |
| Financial math | Pure TypeScript in `lib/core/` |
| LLM orchestration | `lib/ai/` wrappers over OpenAI / Anthropic SDKs |
| Event/async jobs | **Inngest** |
| Heavy compute offload | **Web Workers** (Monte Carlo) |

### 3.3 Data & Auth

| Service | Purpose |
|---|---|
| **Supabase Auth** | Email + password signup, email verification, sessions, JWTs |
| **Supabase Postgres** | Users, profiles, goals, portfolios, simulations, AMFI schemes |
| **pgvector** | Vector store for chat memory / RAG |
| **Browser LocalStorage** | Beginner onboarding payload, saved plan snapshots, experience flag |

### 3.4 DevOps

| Stage | Tech |
|---|---|
| Version control | **GitHub** |
| CI/CD | **Vercel** (auto-deploy on push) |
| Hosting | **Vercel Edge Network** (global CDN, automatic HTTPS) |
| Secrets | **Vercel Environment Variables** (Supabase keys, OpenAI/Anthropic keys) |

---

## 4. Folder Structure

```
artha/
├── app/                                # Next.js App Router
│   ├── page.tsx                        # Dashboard entry (auth-gated)
│   ├── layout.tsx                      # Root layout + globals.css
│   ├── globals.css                     # Corex-themed design tokens
│   ├── actions.ts                      # Server actions
│   ├── login/page.tsx                  # Login with experience-aware routing
│   ├── register/page.tsx               # Signup with experience gate
│   ├── profile/page.tsx                # Account profile screen
│   ├── onboarding/
│   │   └── beginner/page.tsx           # 5-step beginner wizard
│   └── api/
│       ├── auth/
│       │   ├── lookup/route.ts
│       │   └── register-profile/route.ts
│       ├── onboarding/chat/route.ts    # LLM goal extraction (streaming)
│       ├── profile/compute/route.ts    # Risk profile computation
│       ├── portfolio/build/route.ts    # Full plan build (profile→alloc→sim)
│       ├── simulation/run/route.ts     # Monte Carlo trigger
│       ├── explain/route.ts            # LLM plan explanation (streaming)
│       ├── ips/route.ts                # IPS PDF generation
│       ├── copilot/chat/route.ts       # Context-aware Q&A
│       └── inngest/route.ts            # Inngest webhook
│
├── components/                         # React UI components
│   ├── dashboard-shell.tsx             # Master dashboard orchestrator
│   ├── allocation-breakdown.tsx        # Bar + per-sleeve cards
│   ├── portfolio-growth-chart.tsx      # Line + ComparisonGrowthChart
│   ├── risk-return-chart.tsx           # Scatter (risk vs return)
│   ├── market-insights.tsx             # Plain-English takeaways
│   ├── investment-canvas.tsx           # React Flow interactive map
│   ├── kpi-card.tsx                    # Single KPI tile
│   └── suggestion-card.tsx             # Per-fund recommendation card
│
├── lib/
│   ├── types.ts                        # Canonical TypeScript contracts
│   ├── utils.ts                        # formatCurrency, formatPercent, clamp, round2
│   ├── core/                           # DETERMINISTIC FINANCIAL CORE
│   │   ├── profiling.ts                # Risk score (0-100) + behavioral flags
│   │   ├── allocation.ts               # Equity/debt/gold/cash split + glide path
│   │   ├── selector.ts                 # Picks 4-6 funds from universe
│   │   ├── ranking.ts                  # Composite score formula
│   │   ├── monte_carlo.ts              # Block bootstrap, 10k simulations
│   │   ├── target_planning.ts          # Required SIP calculation
│   │   ├── diversification.ts          # Concentration score
│   │   ├── universe.ts                 # Mock AMFI-style fund universe
│   │   ├── engine.ts                   # Orchestrator (profile→alloc→select→sim)
│   │   └── defaults.ts                 # Factory functions for empty state
│   ├── ai/                             # NARRATIVE SHELL
│   │   ├── extract.ts                  # Goal extraction prompts
│   │   ├── explain.ts                  # Plain-English explainer
│   │   └── copilot.ts                  # Q&A with portfolio context
│   ├── data/                           # Static mock data (AMFI universe)
│   ├── db/                             # Supabase query helpers
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   └── fallback.ts                 # Graceful handling of missing tables
│   └── workers/
│       └── monte_carlo.worker.ts       # Web Worker entry point
│
├── supabase/
│   └── migrations/                     # SQL schema + RLS policies
│
├── inngest/                            # Inngest function definitions
├── public/                             # Static assets
├── styles/                             # Reserved for theme tokens
├── package.json
├── tsconfig.json
├── next.config.ts
└── vercel.json (implicit)
```

---

## 5. Data Model

### 5.1 Entity Relationship (simplified)

```
auth.users (Supabase Auth)
    │
    ▼ 1:1
users ──────────────┬────────────── profiles (risk profile + inputs)
    │               │
    │               ├────────────── goals (goal extraction + UI state)
    │               │
    │               ├────────────── portfolios (saved plan snapshots)
    │               │
    │               ├────────────── simulations (Monte Carlo results)
    │               │
    │               ├────────────── behavioral_events
    │               │
    │               └────────────── chat_memory (pgvector)
    │
    └── sessions

amfi_schemes ─── 1:N ─── nav_history
```

### 5.2 Core Tables

| Table | Columns (essential) | RLS |
|---|---|---|
| `users` | id, email, full_name, user_handle, phone_number, created_at | user can only read/write own row |
| `profiles` | user_id, raw_input (JSONB), risk_score, risk_band, portfolio (JSONB) | user-owned |
| `goals` | user_id, inputs (JSONB with goal + targetPlan + ui), simulation (JSONB) | user-owned |
| `portfolios` | id, user_id, plan_name, scenario_name, inflation_rate, allocation, portfolio, simulation, target_plan, created_at | user-owned |
| `simulations` | id, user_id, inputs, result, created_at | user-owned |
| `amfi_schemes` | id, amfi_code, name, category, fund_house, expense_ratio, aum_cr, tracking_error, manager_tenure_years, downside_capture_ratio | public read |
| `nav_history` | scheme_id, date, nav | public read |
| `chat_memory` | user_id, embedding (vector), content, created_at | user-owned |
| `behavioral_events` | user_id, event_type, payload, created_at | user-owned |

### 5.3 TypeScript Contracts

All shapes live in `lib/types.ts`. Selected types:

```ts
ProfileInput {
  age, annualIncome, monthlySavings, goalAmount, horizonYears,
  riskPreference (1-5), emergencyMonths, dependents,
  investmentExperience (1-5), drawdownTolerance (1-5),
  incomeStability (1-5), goalFlexibility (1-5),
  reactionToLoss: "panic" | "concerned" | "steady"
}

ProfileResult { riskScore, riskBand, behavioralFlags, rationale }

AllocationResult { riskBand, current: Slice[], glidePath }

PortfolioInstrument { schemeId, name, asset, weight, allocationWeight,
  monthlySipShare, expectedReturn, risk, returnSeries, ... }

MonteCarloResult { simulations, percentiles (p5..p95),
  probabilityOfSuccess, worstDrawdown, medianTerminalValue, ... }

PortfolioResult { profile, allocation, instruments,
  diversification, portfolioExpectedReturn, portfolioRisk, ... }
```

---

## 6. Module Responsibilities

### 6.1 Deterministic Core (`lib/core/`)

| Module | Input | Output | Determinism |
|---|---|---|---|
| `profiling.ts` | `ProfileInput` | `ProfileResult` with score 0-100 | Pure function |
| `allocation.ts` | riskBand, riskScore, horizon, riskPref, emergencyMonths | `AllocationResult` (4 sleeves + glide path) | Pure function |
| `selector.ts` | `ProfileResult`, `ProfileInput` | Allocation + 4-6 instruments with weights | Uses universe.ts; deterministic ordering |
| `ranking.ts` | `FundScheme` | Composite score 0-1 via weighted formula | Pure function |
| `monte_carlo.ts` | `MonteCarloInput` | Percentiles, success probability, worst drawdown | Seeded RNG for reproducibility |
| `target_planning.ts` | target, years, monthly, expected return | required SIP, gap, success estimate | Pure function |
| `diversification.ts` | instruments | concentration score 0-100 | Pure function |
| `compliance.ts` | full plan | IPS PDF byte stream | Deterministic rendering |
| `engine.ts` | `ProfileInput` + `GoalExtraction` | Full `PortfolioResult` | Orchestrates all of the above |

### 6.2 Narrative Shell (`lib/ai/`)

| Module | Job | Prompt Strategy |
|---|---|---|
| `extract.ts` | Parse user's chat into `GoalExtraction` | Structured output with JSON schema |
| `explain.ts` | Turn numbers into plain English | Streamed; receives portfolio context only |
| `copilot.ts` | Answer follow-up questions | Receives allocation, risk score, instruments; never asked to compute |

### 6.3 UI Layer (`components/`)

| Component | Purpose |
|---|---|
| `dashboard-shell.tsx` | State orchestration, compute button, localStorage hydration, save/compare logic |
| `allocation-breakdown.tsx` | Allocation bar + per-sleeve cards with colors and descriptions |
| `portfolio-growth-chart.tsx` | Line chart (invested/projected/target) + `ComparisonGrowthChart` for 2 plans |
| `risk-return-chart.tsx` | Scatter: x = volatility, y = expected return, z = weight |
| `market-insights.tsx` | Plain-English takeaways derived from allocation + profile flags |
| `investment-canvas.tsx` | React Flow interactive node graph |
| `kpi-card.tsx` | Single metric tile with alternating orange/dark styling |
| `suggestion-card.tsx` | One fund recommendation with rationale |

---

## 7. Runtime Flow — End-to-End Plan Build

```
User clicks "Compute / Update Plan"
   │
   ▼
dashboard-shell.handleCompute()
   │
   ▼
POST /api/portfolio/build { profileInput, goal, targetAmount, years, ... }
   │
   ▼
Route Handler
   │
   ├── computeRiskProfile(profileInput)           → ProfileResult
   │
   ├── buildAllocation(riskBand, riskScore,
   │                   horizon, riskPref,
   │                   emergencyMonths)            → AllocationResult
   │
   ├── selectPortfolio(profile, profileInput)     → PortfolioInstrument[]
   │      └── ranks universe via rankScheme()
   │
   ├── Monte Carlo trigger (Web Worker on client) → MonteCarloResult
   │      └── block bootstrap × 10,000 runs
   │
   ├── computeTargetPlan()                         → TargetPlanResult
   │
   ├── computeDiversification(instruments)        → DiversificationResult
   │
   └── persist to Supabase (profiles, goals, simulations)
   │
   ▼
Response: { profile, portfolio, simulation, targetPlan, cached }
   │
   ▼
dashboard-shell setState → every panel re-renders from new values
```

---

## 8. API Surface

| Endpoint | Method | Purpose | Streaming |
|---|---|---|---|
| `/api/auth/lookup` | POST | Check userId availability / resolve identifier → email | No |
| `/api/auth/register-profile` | POST | Create user row after signup | No |
| `/api/onboarding/chat` | POST | LLM goal extraction from chat | Yes (NDJSON) |
| `/api/profile/compute` | POST | Standalone risk profile computation | No |
| `/api/portfolio/build` | POST | Full plan build (profile + alloc + select + sim) | No |
| `/api/simulation/run` | POST | Trigger Monte Carlo | No |
| `/api/explain` | POST | Plain-English explanation of a plan | Yes (NDJSON) |
| `/api/ips/generate` | POST | Generate Investment Policy Statement PDF | No |
| `/api/copilot/chat` | POST | Portfolio-aware Q&A | No |
| `/api/inngest` | POST | Inngest webhook for background jobs | No |

All POST endpoints validate body shape and respond with `{ error, details }` on failure.

---

## 9. Security Architecture

### 9.1 Authentication
- **Supabase Auth** manages email + password, email verification, and session JWTs.
- Session tokens are stored in httpOnly cookies managed by Supabase SDK.
- userIds are normalized to lowercase for case-insensitive login.

### 9.2 Authorization (RLS)
Every Supabase table has an RLS policy of the form:

```sql
CREATE POLICY "user can access own data"
  ON <table>
  FOR ALL
  USING (auth.uid() = user_id);
```

Anonymous users see nothing; authenticated users see only their own rows.

### 9.3 Secrets Management
- Supabase anon key, service role key, OpenAI/Anthropic keys, Inngest keys live in Vercel env vars.
- `.env.local` is gitignored; no secret ever ships in the repo.
- Client-side code only sees the **anon key** — never the service role key.

### 9.4 Input Validation
- All API route handlers validate body shapes before touching the core.
- Numeric inputs are clamped via `clamp(value, min, max)` in `lib/utils.ts`.
- Username regex: `/^[a-zA-Z0-9_]{4,20}$/`.
- Email regex on both client and server.

### 9.5 Transport
- HTTPS everywhere (Vercel default).
- Supabase connection over TLS.

---

## 10. Performance Architecture

### 10.1 Monte Carlo Offload
Running 10,000 simulations on the main thread would block the UI for seconds. Artha:
1. Spawns a **Web Worker** from `lib/workers/monte_carlo.worker.ts`.
2. The worker imports the deterministic `monte_carlo.ts` module.
3. Results are `postMessage`-d back to the main thread.
4. UI stays interactive throughout.

### 10.2 Caching Strategy
- **Client cache** (`portfolioCacheRef` in `dashboard-shell.tsx`): memoizes `{ requestBody → response }` so repeated compute clicks with identical inputs are instant.
- **Server cache**: portfolio builds include a `cached: boolean` flag when the same inputs hit the server twice in a session.
- **LocalStorage**: beginner onboarding + saved plans persist offline without a server round-trip.

### 10.3 Rendering
- Dashboard panels are **gated behind `hasComputedOnce`**, so the initial render is lightweight.
- Expensive derivations (`growthData`, `scenarioContext`, `copilotPortfolio`) are wrapped in `useMemo`.
- Recharts components use `animationDuration` for smooth transitions without overworking the CPU.

### 10.4 Network
- All assets served from Vercel's global edge CDN.
- Streaming endpoints (`/api/explain`, `/api/onboarding/chat`) use NDJSON so the user sees text as it generates.

---

## 11. Observability

| Concern | Mechanism |
|---|---|
| Client errors | `status` string in dashboard state; visible in hero metric |
| API errors | Structured `{ error, details }` JSON + HTTP status code |
| Supabase schema drift | `isMissingTableError()` helper degrades gracefully to auth-metadata-only mode |
| LLM latency | Streaming mitigates perception; NDJSON lines logged client-side |
| Monte Carlo integrity | Percentiles included in every response; worst drawdown always reported |

---

## 12. Deployment Architecture

### 12.1 Environments

| Environment | Host | Trigger |
|---|---|---|
| Local development | `localhost:3000` via `npm run dev` | Manual |
| Preview deployment | Vercel preview URL | Every GitHub PR |
| Production | `artha.vercel.app` (or custom domain) | Merge to `main` branch |

### 12.2 Build Pipeline

```
git push origin main
       │
       ▼
GitHub webhook → Vercel
       │
       ▼
Vercel runs:
  1. npm install
  2. next build (TypeScript check, compile, bundle)
  3. Deploy compiled output to edge network
       │
       ▼
Production URL updated (usually < 2 min)
```

### 12.3 Environment Variables (Vercel)

| Key | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin key |
| `OPENAI_API_KEY` | LLM for explanation / copilot |
| `ANTHROPIC_API_KEY` | Alternate LLM provider |
| `INNGEST_EVENT_KEY` | Background job authentication |
| `INNGEST_SIGNING_KEY` | Webhook verification |

### 12.4 Rollback Strategy
- Every Vercel deployment is immutable.
- "Promote to production" any previous deployment in one click.
- No database migrations are auto-run on deploy; Supabase migrations are applied manually for safety.

### 12.5 Scaling
- **Vercel**: auto-scales serverless functions horizontally.
- **Supabase**: free tier handles ~500 concurrent connections; paid tiers scale linearly.
- **Web Worker compute**: runs on the user's own device, so each user adds zero server load for Monte Carlo.

---

## 13. Extensibility & Future Architecture

### 13.1 Real AMFI Integration
- Swap `lib/core/universe.ts` from mock data to a live AMFI fetcher.
- Add a nightly Inngest job to refresh `amfi_schemes` and `nav_history`.
- No change to the ranking / selection logic.

### 13.2 Multi-Goal Planning
- `goals` table already accepts JSONB; schema can carry an array of goals.
- Engine would iterate per goal and aggregate allocation across the user's total capital.

### 13.3 Mobile (Flutter)
- All business logic lives in the server API. A Flutter app would consume the same `/api/portfolio/build` endpoint.
- Authentication via Supabase Flutter SDK.

### 13.4 Realtime Updates
- Supabase Realtime already supports change streams on `portfolios` and `simulations`.
- Adding live fund price updates requires a ticker source + Supabase subscription on the client.

### 13.5 Broker Linkage
- An adapter layer (`lib/brokers/*`) could translate a `PortfolioResult` into actual buy orders via Zerodha Kite / Groww APIs.
- Requires KYC + OAuth flow — intentionally out of the hackathon scope.

---

## 14. Architectural Decisions (ADR-Style Log)

| # | Decision | Rationale |
|---|---|---|
| 1 | Next.js 15 App Router over Express + SPA | Single codebase; server + client share types. |
| 2 | Supabase over custom Postgres + Auth | Drastically reduces auth/infra scope for a hackathon. |
| 3 | Pure TS core, not Python microservice | No cold starts, no extra deployment target, deterministic in the browser too. |
| 4 | Web Worker for Monte Carlo | Keeps UI responsive during 10k simulations. |
| 5 | LocalStorage for saved plans (max 2) | Works offline; demonstrates user control; doesn't require schema. |
| 6 | LLM confined to explanation | Avoids hallucination in financial advice. |
| 7 | Compute-on-demand (no auto-recompute) | User stays in control; matches prototype UX brief. |
| 8 | Corex-themed custom CSS instead of a UI library | Keeps bundle small; theme is driven by ~30 CSS variables. |
| 9 | Block bootstrap Monte Carlo over parametric | Preserves real-world autocorrelation; more trustworthy. |
| 10 | Deploy via Vercel | Zero-config for Next.js; free tier; global edge. |

---

## 15. Testing Strategy (Recommended Next Steps)

| Layer | Approach |
|---|---|
| Core modules | Pure-function unit tests (Vitest / Jest) on `profiling`, `allocation`, `ranking`, `monte_carlo` |
| API routes | Integration tests with a test Supabase project |
| UI | React Testing Library snapshot + interaction tests on `dashboard-shell` |
| End-to-end | Playwright script for the beginner flow: register → wizard → plan → save → compare |
| Regression | Golden inputs → golden outputs for the deterministic core |

---

**End of document.**
