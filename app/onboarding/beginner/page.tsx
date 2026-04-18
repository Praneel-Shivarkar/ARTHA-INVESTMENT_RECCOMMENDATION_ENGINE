"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createInitialGoal, createInitialProfileInput } from "@/lib/core/defaults";
import { GoalExtraction, GoalType, ProfileInput } from "@/lib/types";

type Answers = {
  age: string;
  monthlyTakeHome: string;
  monthlySavings: string;
  dreamName: GoalType;
  dreamCost: string;
  dreamYears: string;
  savedAlready: string;
  comfortWithUps: "calm" | "nervous" | "panic";
  incomeMood: "steady" | "okay" | "uncertain";
  safetyCushionMonths: string;
  dependents: string;
};

const dreamOptions: Array<{ value: GoalType; label: string; blurb: string }> = [
  { value: "Retirement", label: "Peaceful retirement", blurb: "Build a nest egg so you can stop working one day." },
  { value: "Child Education", label: "Kid's education", blurb: "Pay for school or college when the time comes." },
  { value: "Home Purchase", label: "Buy a home", blurb: "Save up for a down payment on a house or flat." },
  { value: "Emergency Corpus", label: "Emergency cushion", blurb: "Keep money ready for surprises like job loss or medical bills." },
  { value: "Vacation", label: "Big trip", blurb: "Save for a dream vacation." },
  { value: "Wealth Creation", label: "Grow my money", blurb: "Just want my savings to grow faster than a bank account." }
];

const steps = [
  "Tell us about you",
  "Your money right now",
  "What are you saving for?",
  "Your comfort with risk",
  "Safety net"
] as const;

function toNum(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function comfortToRisk(answers: Answers): ProfileInput["riskPreference"] {
  if (answers.comfortWithUps === "calm") return 4;
  if (answers.comfortWithUps === "nervous") return 2;
  return 1;
}

function comfortToReaction(answers: Answers): ProfileInput["reactionToLoss"] {
  if (answers.comfortWithUps === "calm") return "steady";
  if (answers.comfortWithUps === "nervous") return "concerned";
  return "panic";
}

function incomeToStability(answers: Answers): ProfileInput["incomeStability"] {
  if (answers.incomeMood === "steady") return 5;
  if (answers.incomeMood === "okay") return 3;
  return 2;
}

export default function BeginnerOnboardingPage() {
  const router = useRouter();
  const defaults = useMemo(() => createInitialProfileInput(), []);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    age: "",
    monthlyTakeHome: "",
    monthlySavings: "",
    dreamName: "Wealth Creation",
    dreamCost: "",
    dreamYears: "",
    savedAlready: "0",
    comfortWithUps: "nervous",
    incomeMood: "okay",
    safetyCushionMonths: "3",
    dependents: "0"
  });

  function update<K extends keyof Answers>(key: K, value: Answers[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  function finish() {
    setSubmitting(true);
    const annualIncome = toNum(answers.monthlyTakeHome, defaults.annualIncome / 12) * 12;
    const profileInput: ProfileInput = {
      age: toNum(answers.age, defaults.age),
      annualIncome,
      monthlySavings: toNum(answers.monthlySavings, defaults.monthlySavings),
      goalAmount: toNum(answers.dreamCost, defaults.goalAmount),
      horizonYears: Math.max(1, Math.min(30, toNum(answers.dreamYears, defaults.horizonYears))),
      riskPreference: comfortToRisk(answers),
      emergencyMonths: toNum(answers.safetyCushionMonths, 3),
      dependents: Math.max(0, Number(answers.dependents) || 0),
      investmentExperience: 1,
      drawdownTolerance: comfortToRisk(answers),
      incomeStability: incomeToStability(answers),
      goalFlexibility: 3,
      reactionToLoss: comfortToReaction(answers)
    };

    const goal: GoalExtraction = {
      ...createInitialGoal(),
      goalType: answers.dreamName,
      targetAmount: profileInput.goalAmount,
      horizonYears: profileInput.horizonYears,
      monthlyContribution: profileInput.monthlySavings,
      lumpSum: Number(answers.savedAlready) || 0,
      emotionalWeight: "high",
      contradictions: [],
      summary: `Beginner plan: ${profileInput.goalAmount} in ${profileInput.horizonYears} years for ${answers.dreamName}.`
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem("artha-beginner-profile", JSON.stringify({ profileInput, goal, savedAt: Date.now() }));
      window.localStorage.setItem("artha-experience-years", "0");
      window.localStorage.setItem("artha-beginner-onboarded", "1");
    }

    router.replace("/?beginner=1");
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <span className="eyebrow">Beginner Setup</span>
          <h1>Let&apos;s build your plan in plain English</h1>
          <p>
            No jargon, no math. Answer five quick questions and we&apos;ll pre-fill your dashboard with a sensible starter
            plan. You can always tweak it later.
          </p>
          <div className="auth-highlights">
            {steps.map((label, index) => (
              <div key={label} className={`auth-pill ${index === step ? "" : ""}`}>
                {index + 1}. {label}
              </div>
            ))}
          </div>
        </div>

        <div className="auth-card">
          <div className="panel-header">
            <h2>
              Step {step + 1} of {steps.length}: {steps[step]}
            </h2>
          </div>

          {step === 0 ? (
            <div className="stack">
              <div className="field">
                <label>How old are you?</label>
                <input
                  inputMode="numeric"
                  value={answers.age}
                  onChange={(e) => update("age", e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="e.g. 28"
                />
              </div>
              <div className="field">
                <label>How many people depend on your income?</label>
                <input
                  inputMode="numeric"
                  value={answers.dependents}
                  onChange={(e) => update("dependents", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="0 if just yourself"
                />
                <div className="fine">Kids, parents, or anyone you financially support.</div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="stack">
              <div className="field">
                <label>What do you take home in a month (after tax, in INR)?</label>
                <input
                  inputMode="numeric"
                  value={answers.monthlyTakeHome}
                  onChange={(e) => update("monthlyTakeHome", e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="e.g. 80000"
                />
              </div>
              <div className="field">
                <label>How much of that can you set aside every month?</label>
                <input
                  inputMode="numeric"
                  value={answers.monthlySavings}
                  onChange={(e) => update("monthlySavings", e.target.value.replace(/\D/g, "").slice(0, 9))}
                  placeholder="e.g. 15000"
                />
                <div className="fine">A rough number is fine &mdash; you can adjust later.</div>
              </div>
              <div className="field">
                <label>How does your income feel month to month?</label>
                <select value={answers.incomeMood} onChange={(e) => update("incomeMood", e.target.value as Answers["incomeMood"])}>
                  <option value="steady">Very steady salary</option>
                  <option value="okay">Mostly steady, some ups and downs</option>
                  <option value="uncertain">Unpredictable / freelance / gig</option>
                </select>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="stack">
              <div className="field">
                <label>What are you saving towards?</label>
                <select
                  value={answers.dreamName}
                  onChange={(e) => update("dreamName", e.target.value as GoalType)}
                >
                  {dreamOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="fine">{dreamOptions.find((o) => o.value === answers.dreamName)?.blurb}</div>
              </div>
              <div className="field">
                <label>Roughly how much will it cost? (INR)</label>
                <input
                  inputMode="numeric"
                  value={answers.dreamCost}
                  onChange={(e) => update("dreamCost", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="e.g. 5000000"
                />
                <div className="fine">A ballpark is fine. 5000000 = 50 lakh.</div>
              </div>
              <div className="field">
                <label>In how many years do you want to get there?</label>
                <input
                  inputMode="numeric"
                  value={answers.dreamYears}
                  onChange={(e) => update("dreamYears", e.target.value.replace(/\D/g, "").slice(0, 2))}
                  placeholder="e.g. 10"
                />
              </div>
              <div className="field">
                <label>Have you already saved something for this? (INR, enter 0 if not)</label>
                <input
                  inputMode="numeric"
                  value={answers.savedAlready}
                  onChange={(e) => update("savedAlready", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="0"
                />
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="stack">
              <div className="field">
                <label>If your investments dropped by 20% in a bad month, how would you feel?</label>
                <select
                  value={answers.comfortWithUps}
                  onChange={(e) => update("comfortWithUps", e.target.value as Answers["comfortWithUps"])}
                >
                  <option value="calm">I&apos;d stay calm &mdash; ups and downs are normal</option>
                  <option value="nervous">I&apos;d feel nervous but wait it out</option>
                  <option value="panic">I&apos;d panic and want to pull my money out</option>
                </select>
                <div className="fine">
                  This helps us decide how much of your money should grow fast (riskier) vs stay safe (slower).
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="stack">
              <div className="field">
                <label>How many months of expenses do you have saved as an emergency cushion?</label>
                <select
                  value={answers.safetyCushionMonths}
                  onChange={(e) => update("safetyCushionMonths", e.target.value)}
                >
                  <option value="0">None yet</option>
                  <option value="1">About 1 month</option>
                  <option value="3">Around 3 months</option>
                  <option value="6">Around 6 months</option>
                  <option value="12">12 months or more</option>
                </select>
                <div className="fine">Money in a savings account you wouldn&apos;t touch unless something goes wrong.</div>
              </div>
            </div>
          ) : null}

          <div className="button-row" style={{ marginTop: 18 }}>
            <button className="button secondary" onClick={back} disabled={step === 0 || submitting} type="button">
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="button" onClick={next} type="button">
                Next
              </button>
            ) : (
              <button className="button" onClick={finish} disabled={submitting} type="button">
                {submitting ? "Setting up..." : "Build My Plan"}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
