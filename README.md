<<<<<<< HEAD
# Artha - AI-Powered Investment Planning System

Artha is a production-ready hackathon project built on Next.js 15 App Router. The architecture keeps all financial logic deterministic in TypeScript and limits AI to two jobs only: extracting user goal details and explaining already-computed results.

## Architecture

- Frontend: Next.js 15 App Router, client-side React Flow canvas, browser Web Worker for simulation
- Backend: Next.js route handlers, optional Server Actions, Edge-compatible APIs where possible
- Deterministic core: risk profiling, asset allocation, fund ranking, fund selection, Monte Carlo engine, IPS PDF generator
- Data: Supabase PostgreSQL with pgvector-ready schema
- Async jobs: Inngest event trigger on simulation requests
- AI shell: goal extraction, explanation, and copilot clarification with strict narrative boundaries

## Folder Structure

```text
artha/
├─ app/
│  ├─ actions.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ api/
│     ├─ onboarding/chat/route.ts
│     ├─ profile/compute/route.ts
│     ├─ portfolio/build/route.ts
│     ├─ simulation/run/route.ts
│     ├─ explain/route.ts
│     ├─ ips/generate/route.ts
│     ├─ copilot/chat/route.ts
│     └─ inngest/route.ts
├─ components/
│  ├─ dashboard-shell.tsx
│  ├─ investment-canvas.tsx
│  └─ kpi-card.tsx
├─ inngest/
│  ├─ client.ts
│  └─ functions.ts
├─ lib/
│  ├─ ai/
│  │  ├─ client.ts
│  │  ├─ explanation.ts
│  │  ├─ goal-extractor.ts
│  │  ├─ prompts.ts
│  │  └─ stream.ts
│  ├─ core/
│  │  ├─ allocation.ts
│  │  ├─ compliance.ts
│  │  ├─ engine.ts
│  │  ├─ monte_carlo.ts
│  │  ├─ profiling.ts
│  │  ├─ ranking.ts
│  │  └─ selector.ts
│  ├─ data/amfi-schemes.ts
│  ├─ db/
│  │  ├─ demo.ts
│  │  └─ supabase.ts
│  ├─ workers/monteCarlo.worker.ts
│  ├─ types.ts
│  └─ utils.ts
├─ supabase/
│  ├─ schema.sql
│  └─ seed.sql
├─ .env.example
├─ next.config.ts
├─ package.json
├─ README.md
└─ tsconfig.json
```

## Deterministic Core

- `profiling.ts`: computes 0-100 risk score, risk band, and behavioral flags
- `allocation.ts`: assigns strategic allocation and a glide path across years
- `ranking.ts`: ranks schemes using the required exact weighted score formula
- `selector.ts`: picks 4-6 instruments from the AMFI mock dataset
- `monte_carlo.ts`: runs 10,000 block-bootstrap simulations and outputs percentiles
- `compliance.ts`: generates the Investment Policy Statement PDF

## Database Schema

Use the SQL in [`supabase/schema.sql`](./supabase/schema.sql). It defines the required tables exactly:

- `users`
- `sessions`
- `profiles`
- `goals`
- `amfi_schemes`
- `nav_history`
- `portfolios`
- `simulations`
- `behavioral_events`
- `chat_memory`

Seed the demo user with [`supabase/seed.sql`](./supabase/seed.sql).

## API Surface

- `POST /api/onboarding/chat`: streaming NDJSON onboarding extraction
- `POST /api/profile/compute`: deterministic profile engine
- `POST /api/portfolio/build`: deterministic portfolio construction
- `POST /api/simulation/run`: 10,000-run Monte Carlo output
- `POST /api/explain`: streaming explanation narrative
- `POST /api/ips/generate`: IPS PDF
- `POST /api/copilot/chat`: streaming copilot clarification
- `GET/POST/PUT /api/inngest`: Inngest runtime endpoint

## Local Run

1. Create `.env.local` from `.env.example`.
2. Install packages:

```bash
npm install
```

3. Start Next.js:

```bash
npm run dev
```

4. Open `http://localhost:3000`.
5. Apply Supabase schema and seed:

```sql
\i supabase/schema.sql
\i supabase/seed.sql
```

## Deployment

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add environment variables from `.env.example`.
4. Set up Supabase and run the schema/seed SQL.
5. Create an Inngest app and connect the `/api/inngest` endpoint.
6. Redeploy and verify:
   - onboarding streams structured extraction
   - portfolio build returns deterministic allocation
   - simulation responds with percentiles
   - IPS downloads as PDF

## Demo Flow

1. Start with the preloaded wealth-creation goal.
2. Use onboarding chat to inject a contradiction and watch Artha flag it.
3. Change the SIP using the slider to rerun the deterministic portfolio and simulation.
4. Click through the React Flow nodes for the full decision chain.
5. Generate the IPS PDF for the final artifact.
=======
# ARTHA-INVESTMENT_RECCOMMENDATION_ENGINE
AI-powered investment planning system with deterministic portfolio logic, real-time simulations, and beginner-friendly insights.
>>>>>>> b487d87d7d47b96b1f4230a78f5d43e9663bc553
