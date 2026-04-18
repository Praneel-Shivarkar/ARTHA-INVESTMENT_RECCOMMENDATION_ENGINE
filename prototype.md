# Artha — Prototype Document

> **AI-Powered Investment Planning System for Beginners & Experienced Investors**
> Hackathon Prototype · Built on Next.js 15, Supabase, and a deterministic TypeScript core.

---

## 1. Executive Summary

**Artha** is a web-based investment planning platform that helps users — especially first-time investors — translate life goals into a concrete, numbers-backed investment plan.

Unlike generic AI-chatbot finance tools, Artha uses a **deterministic TypeScript core** for every financial calculation. The AI layer is strictly confined to two jobs: extracting structured information from natural-language goals, and explaining the computed plan in plain English. No financial recommendation ever comes from a language model.

The prototype covers:

- A **beginner onboarding flow** for users with less than 1 year of investing experience.
- A **full-featured dashboard** for experienced users, with risk profiling, allocation design, fund suggestions, Monte Carlo simulation, and plan comparison.
- A **compute-on-demand** workflow so the user explicitly controls when outputs refresh.
- **Save & Compare** of up to two plans with a side-by-side growth chart and capital deltas.
- **Risk vs Return visualization** and **plain-English market insights** for beginners.

---

## 2. Problem Statement

New investors face four recurring pain points:

| Pain Point | Reality |
|---|---|
| **Jargon overload** | Terms like SIP, AUM, tracking error, downside capture mean nothing to a beginner. |
| **Blind advice** | Most apps push products without explaining *why* they fit the user's situation. |
| **Unreliable AI** | Chatbot-style finance tools hallucinate numbers and can't be audited. |
| **No scenario thinking** | Beginners can't easily answer "what if I save ₹5k more?" or "what if I retire 3 years later?" |

**Artha's thesis**: a beginner should be able to describe their goal in plain English, answer five simple questions, and immediately see a mathematically sound plan with a believable probability of success.

---

## 3. Goals & Objectives

### 3.1 Product Goals

1. **Lower the barrier to entry** — anyone can get a credible plan in under 3 minutes.
2. **Remove black-box advice** — every number is traceable to a formula.
3. **Make scenarios interactive** — the user can change any input and recompute instantly.
4. **Separate math from narrative** — the AI never decides, it only explains.

### 3.2 Technical Goals

1. **Deterministic correctness** — same inputs produce identical outputs, forever.
2. **Browser-first performance** — Monte Carlo runs in a Web Worker, UI never freezes.
3. **Zero-config deployment** — one click to Vercel, automatic HTTPS, global edge.
4. **Composable core** — each module (`profiling.ts`, `allocation.ts`, etc.) is independently testable.

### 3.3 Non-Goals (Out of Scope)

- Real-time brokerage integration / live trading.
- Tax filing or optimization.
- Retirement income drawdown simulation.
- Options, derivatives, or crypto.

---

## 4. Target Users

### 4.1 Beginner Investor (Primary)
- **Experience**: Less than 1 year of investing or trading.
- **Needs**: Plain-English guidance, no jargon, pre-filled plan.
- **Entry point**: 5-step `/onboarding/beginner` wizard.
- **Example**: A 25-year-old earning ₹70k/month, no exposure to stocks, wants to save for a home in 10 years.

### 4.2 Experienced Investor (Secondary)
- **Experience**: 1+ year of investing or trading.
- **Needs**: Fine-grained control, scenario comparison, instrument-level transparency.
- **Entry point**: Direct to `/` dashboard with full input controls.
- **Example**: A 32-year-old running a small business, comfortable with SIPs, optimizing a retirement + education plan simultaneously.

---

## 5. Feature Inventory

### 5.1 Authentication & Account
- Email + password signup with Supabase Auth.
- Email verification.
- userId + phone number captured at signup.
- **Experience gate**: "Years of investing/trading experience" field determines routing.

### 5.2 Beginner Onboarding (`/onboarding/beginner`)
A 5-step wizard with plain-English questions:

| Step | Question Set |
|---|---|
| 1. Tell us about you | Age, dependents |
| 2. Your money right now | Monthly take-home, monthly savings, income steadiness |
| 3. What are you saving for? | Goal type, target cost, years, already-saved amount |
| 4. Your comfort with risk | Reaction to a 20% drop (calm / nervous / panic) |
| 5. Safety net | Emergency cushion in months |

Output: Pre-populated `ProfileInput` + `GoalExtraction`, stored in localStorage, dashboard auto-loads.

### 5.3 Dashboard
- **Hero** with success probability and compute button.
- **KPI grid**: risk level, likely future value, worst drawdown, required monthly investment, diversification, goal probability.
- **Goal Planning** panel with inflation slider and what-if scenarios.
- **How your money can grow** — line chart with invested / projected / target paths.
- **How your money is split** — allocation bar + per-asset cards.
- **Your plan at a glance** — React Flow interactive canvas (Goal → Risk → Allocation → Funds → Simulation).
- **About You** — full 10+ field input panel (gated behind compute).
- **Suggested buckets** — per-fund cards with allocation share and rationale.
- **Risk vs Return of your picks** — scatter chart.
- **Basic market insights** — plain-English takeaways.
- **Are you saving enough?** — gap-to-target analysis.
- **Save & Compare Plans** — up to 2 saved plans with side-by-side chart.
- **Copilot Chat** — LLM Q&A with live portfolio context.
- **Portfolio Explanation** — streamed plain-English summary.

### 5.4 Compute-on-Demand Workflow
- Inputs do not trigger recomputation automatically.
- A single **Compute / Update Plan** button in the hero drives everything.
- A yellow "inputs changed" hint appears when the user edits a field after a prior compute.
- Every output panel hides behind a placeholder until first compute.

### 5.5 Save & Compare
- LocalStorage-backed (works even without Supabase).
- Hard limit: 2 plans maximum.
- Each saved plan captures: name, start capital, end capital, target, horizon, monthly savings, required SIP, success probability, expected return, growth curve, and allocation snapshot.
- When 2 plans exist: comparison cards + overlaid growth chart + "winner by ending capital" summary.
- Delete button on each saved plan.

---

## 6. Core Financial Logic (Deterministic)

All formulas live in `lib/core/` — pure TypeScript, no randomness except in Monte Carlo.

### 6.1 Risk Profiling — `profiling.ts`

```
rawScore =
  ageScore + horizonScore + capacityScore + preferenceScore +
  toleranceScore + stabilityScore + experienceScore
  - goalPressurePenalty - liquidityPenalty - dependentsPenalty - panicPenalty
```

- Clamped to [0, 100].
- Classified into Conservative / Balanced / Growth / Aggressive.
- Behavioral flags: panicSeller, overconfident, thinEmergencyBuffer, shortHorizonPressure.

### 6.2 Allocation — `allocation.ts`

Continuous (not stepped) equity weight:

```
equityWeight = 12 + (riskScore/100)*68 + (riskPref-3)*3.5 + (horizon-7)*1.25
// clamped to [10, 90]
```

Cash, gold, and debt are derived from horizon, risk score, and emergency-months. All sleeves are normalized to sum to 100%.

### 6.3 Fund Ranking — `ranking.ts`

```
compositeScore =
  0.25 × return_consistency +
  0.20 × downside_capture +
  0.15 × expense_ratio +
  0.15 × AUM +
  0.15 × tracking_error +
  0.10 × manager_tenure
```

### 6.4 Fund Selection — `selector.ts`

- Picks 4-6 instruments from the AMFI-mock universe.
- Respects allocation weights.
- Spreads across categories within each sleeve.

### 6.5 Monte Carlo — `monte_carlo.ts`

- **Block bootstrap** resampling of monthly returns (preserves autocorrelation).
- 10,000 simulations per run.
- Percentiles returned: p5, p25, p50, p75, p95.
- Probability of success = P(terminal value ≥ target).
- Runs inside a **Web Worker** to keep the UI thread free.

### 6.6 Compliance — `compliance.ts`

- Generates a structured Investment Policy Statement (IPS) PDF.
- Includes risk profile, allocation rationale, selected funds, and simulation outcomes.

---

## 7. User Journeys

### 7.1 First-Time Beginner
1. Lands on `/register` → fills name, email, password, phone, **"0 years" experience**.
2. Supabase creates account, writes `experienceYears: 0` to user metadata, sets `artha-experience-years` in localStorage.
3. Redirect to `/onboarding/beginner`.
4. Completes 5 steps → localStorage populated with `ProfileInput` + `GoalExtraction`.
5. Redirect to `/?beginner=1`.
6. Dashboard reads localStorage, auto-runs first compute, renders full plan.
7. User can save the plan, explore, and tweak.

### 7.2 Experienced User
1. `/register` with **"3 years" experience**.
2. Redirect to `/` dashboard.
3. Fills inputs manually, clicks **Compute / Update Plan**.
4. Every panel recalculates from their inputs.
5. User adjusts risk preference, recomputes, saves as "Aggressive".
6. Changes horizon, recomputes, saves as "Conservative".
7. Comparison chart appears automatically.

### 7.3 Returning User
1. `/login` with email or userId.
2. Session restored, `experienceYears` read from metadata.
3. Routed to `/onboarding/beginner` (if beginner and not yet onboarded) or `/` dashboard.
4. Past saved plans rehydrate from localStorage.

---

## 8. Screens Inventory

| Route | Purpose |
|---|---|
| `/register` | Account creation with experience gate |
| `/login` | Email/userId login with experience-aware routing |
| `/onboarding/beginner` | 5-step plain-English wizard |
| `/` | Full investor dashboard |
| `/profile` | Account profile and session management |

---

## 9. Design System

### 9.1 Visual Language (Corex-inspired)
- **Page background**: Soft off-white (`#f2f2ef`).
- **Hero & auth-copy**: Near-black (`#0e1117`) with a subtle orange radial glow.
- **Panels**: White cards with 28px radius and soft shadow.
- **Accent**: Corex orange (`#ff5b2e` → `#ef4e20`).
- **Pill buttons** with glow on primary, outlined on secondary.
- **Alternating KPI tiles** — every second tile is orange for rhythm.

### 9.2 Typography
- **Family**: Inter / Segoe UI fallback.
- **Headings**: Weight 800, tight tracking (`-0.01em`).
- **Body**: Weight 500, 1.5 line-height.

### 9.3 Motion
- Fade-in keyframe on panel mount (0.45s ease).
- Hover lift on panels (`translateY(-2px)`) with shadow deepening.

---

## 10. Non-Functional Requirements

| Concern | Approach |
|---|---|
| **Performance** | Static rendering where possible; Monte Carlo offloaded to Web Worker; memoization via `portfolioCacheRef`. |
| **Security** | Supabase RLS on every table; secrets in Vercel env vars; email verification; HTTPS everywhere. |
| **Accessibility** | Semantic HTML, keyboard-reachable controls, strong color contrast after retheme. |
| **Reliability** | Deterministic core means no flaky outputs. LocalStorage fallback when Supabase tables are missing. |
| **Scalability** | Vercel edge auto-scales; Supabase free tier handles thousands of concurrent users. |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM hallucination in explanations | Send structured context only; never ask LLM for numbers. |
| Supabase downtime | LocalStorage fallback for saved plans; auth is the only hard dependency. |
| Monte Carlo bias | Block bootstrap preserves return correlations. |
| User saturation from too many inputs | Beginner wizard strips to 5 simple questions. |
| Over-fitting to demo data | Universe is AMFI-style mock data, swappable to real AMFI feed without logic changes. |

---

## 12. Success Metrics (Prototype Stage)

- A new user can reach their first computed plan in under **3 minutes**.
- Every input field, when changed and recomputed, measurably moves at least one KPI.
- Monte Carlo runs 10,000 simulations in under **2 seconds** on a modern laptop.
- Save & Compare works fully offline (localStorage only).
- 100% of financial outputs are traceable to a deterministic TypeScript function.

---

## 13. Demo Script (3-Minute Walkthrough)

1. **Register** as a beginner (0 years experience) → lands on wizard.
2. Answer 5 questions → dashboard auto-loads with a pre-built plan.
3. Show KPI grid: risk level, success probability, required SIP.
4. Walk through allocation bar and fund suggestions.
5. Change risk preference from 2 to 5 → click Compute → show every number shift.
6. Save as "Safe Plan" → change horizon → recompute → save as "Aggressive Plan".
7. Show the side-by-side comparison chart + winner summary.
8. Ask Copilot: *"Why did you pick this allocation?"* → streamed explanation.
9. End on Risk vs Return scatter and market insights panel.

---

## 14. Future Enhancements

- Real AMFI API integration.
- Flutter mobile companion app.
- Live portfolio tracking with Supabase Realtime.
- Automatic rebalancing recommendations.
- Goal contradiction detection via LLM (e.g., "retire in 3 years with ₹10cr on ₹80k/month income").
- Multi-goal simultaneous planning.
- Broker linkage (Zerodha / Groww) for order placement.

---

**Status**: Working prototype, deployed on Vercel, runnable end-to-end.
