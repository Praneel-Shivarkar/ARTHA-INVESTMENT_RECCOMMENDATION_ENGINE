"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AllocationBreakdown } from "@/components/allocation-breakdown";
import { ComparisonGrowthChart, PortfolioGrowthChart, type GrowthPoint } from "@/components/portfolio-growth-chart";
import { RiskReturnChart } from "@/components/risk-return-chart";
import { MarketInsights } from "@/components/market-insights";
import { SuggestionCard } from "@/components/suggestion-card";
import { KpiCard } from "@/components/kpi-card";
import { InvestmentCanvas } from "@/components/investment-canvas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildProfileFromAuthUser, isMissingTableError } from "@/lib/supabase/fallback";
import {
  ChatMessage,
  CopilotPortfolioContext,
  GoalExtraction,
  GoalType,
  PortfolioResult,
  ProfileInput,
  ProfileResult,
  SavedPlan,
  SimulationResponse,
  TargetPlanResult,
  UserAccountProfile
} from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

async function readNdjson<T>(response: Response, onEvent: (event: T) => void) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.filter(Boolean).forEach((line) => onEvent(JSON.parse(line) as T));
  }
}

async function readJsonResponse<T>(response: Response): Promise<T & { error?: string; details?: string }> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error("Portfolio API returned an empty response.");
  }

  try {
    return JSON.parse(text) as T & { error?: string; details?: string };
  } catch {
    throw new Error("Portfolio API returned invalid JSON.");
  }
}

type PortfolioBuildPayload = {
  profile?: ProfileResult;
  portfolio?: PortfolioResult;
  simulation?: SimulationResponse["simulation"];
  targetPlan?: TargetPlanResult;
  cached?: boolean;
};

const goalOptions: GoalType[] = [
  "Unknown",
  "Retirement",
  "Wealth Creation",
  "Child Education",
  "Emergency Corpus",
  "Home Purchase",
  "Vacation"
];

const scenarioOptions = [
  { id: "base", label: "Base Case", savingsMultiplier: 1, riskShift: 0, targetMultiplier: 1 },
  { id: "boost", label: "Boost SIP", savingsMultiplier: 1.2, riskShift: 0, targetMultiplier: 1 },
  { id: "secure", label: "Safety First", savingsMultiplier: 1.05, riskShift: -1, targetMultiplier: 0.98 },
  { id: "stretch", label: "Stretch Goal", savingsMultiplier: 1.1, riskShift: 1, targetMultiplier: 1.15 }
] as const;

type ScenarioId = (typeof scenarioOptions)[number]["id"];

type LocalPlan = {
  id: string;
  name: string;
  createdAt: string;
  startCapital: number;
  endCapital: number;
  targetAmount: number;
  horizonYears: number;
  monthlySavings: number;
  requiredMonthly: number;
  successProbability: number;
  expectedReturn: number;
  growth: GrowthPoint[];
  allocation: Array<{ asset: string; weight: number }>;
};

const LOCAL_PLANS_KEY = "artha-local-plans";

function loadLocalPlans(): LocalPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_PLANS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalPlan[];
    return Array.isArray(parsed) ? parsed.slice(0, 2) : [];
  } catch {
    return [];
  }
}

function persistLocalPlans(plans: LocalPlan[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_PLANS_KEY, JSON.stringify(plans.slice(0, 2)));
}

function clampRiskPreference(value: number): ProfileInput["riskPreference"] {
  return Math.max(1, Math.min(5, Math.round(value))) as ProfileInput["riskPreference"];
}

function roundCurrency(value: number) {
  return Math.round(value);
}

function createScenarioInputs(goal: GoalExtraction, profileInput: ProfileInput, inflationRate: number, scenarioId: ScenarioId) {
  const scenario = scenarioOptions.find((option) => option.id === scenarioId) ?? scenarioOptions[0];
  const baseYears = goal.horizonYears ?? profileInput.horizonYears;
  const baseAmount = goal.targetAmount ?? profileInput.goalAmount;
  const inflatedTarget = roundCurrency(baseAmount * Math.pow(1 + inflationRate / 100, baseYears));
  const scenarioTarget = roundCurrency(inflatedTarget * scenario.targetMultiplier);
  const scenarioSavings = roundCurrency(profileInput.monthlySavings * scenario.savingsMultiplier);
  const adjustedRiskPreference = clampRiskPreference(profileInput.riskPreference + scenario.riskShift);

  return {
    effectiveGoal: {
      ...goal,
      targetAmount: scenarioTarget,
      horizonYears: baseYears
    },
    effectiveProfileInput: {
      ...profileInput,
      goalAmount: scenarioTarget,
      horizonYears: baseYears,
      monthlySavings: scenarioSavings,
      riskPreference: adjustedRiskPreference
    },
    inflatedTarget
  };
}

function buildGrowthData(
  years: number,
  monthlySavings: number,
  lumpSum: number,
  targetAmount: number,
  portfolioReturn: number
): GrowthPoint[] {
  const annualRate = Math.max(portfolioReturn / 100, 0.01);
  const monthlyRate = annualRate / 12;
  let invested = lumpSum;
  let projected = lumpSum;

  return Array.from({ length: years + 1 }, (_, year) => {
    if (year === 0) {
      return {
        year,
        invested: lumpSum,
        projected: lumpSum,
        target: targetAmount
      };
    }

    for (let month = 0; month < 12; month += 1) {
      invested += monthlySavings;
      projected = projected * (1 + monthlyRate) + monthlySavings;
    }

    return {
      year,
      invested: roundCurrency(invested),
      projected: roundCurrency(projected),
      target: roundCurrency(targetAmount * (year / years))
    };
  });
}

export function DashboardShell({
  initialGoal,
  initialPortfolio,
  initialSimulation,
  initialTargetPlan,
  initialProfileInput
}: {
  initialGoal: GoalExtraction;
  initialPortfolio: PortfolioResult;
  initialSimulation: SimulationResponse["simulation"];
  initialTargetPlan: TargetPlanResult;
  initialProfileInput: ProfileInput;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState<GoalExtraction>(initialGoal);
  const [portfolio, setPortfolio] = useState<PortfolioResult>(initialPortfolio);
  const [simulation, setSimulation] = useState<SimulationResponse["simulation"]>(initialSimulation);
  const [targetPlan, setTargetPlan] = useState<TargetPlanResult>(initialTargetPlan);
  const [profileInput, setProfileInput] = useState<ProfileInput>(initialProfileInput);
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null);
  const [userProfile, setUserProfile] = useState<UserAccountProfile | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [comparePlanId, setComparePlanId] = useState<string>("");
  const [planName, setPlanName] = useState("My current plan");
  const [inflationRate, setInflationRate] = useState(6);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("base");
  const [copilotMessages, setCopilotMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ask anything about the current portfolio and I will answer using your live portfolio context." }
  ]);
  const [copilotDraft, setCopilotDraft] = useState("Why this portfolio?");
  const [explanation, setExplanation] = useState("");
  const [status, setStatus] = useState("Start entering your target and duration.");
  const [isComputing, setIsComputing] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [hasWorkspaceLoaded, setHasWorkspaceLoaded] = useState(false);
  const [hasComputedOnce, setHasComputedOnce] = useState(false);
  const [isBeginnerMode, setIsBeginnerMode] = useState(false);
  const [localPlans, setLocalPlans] = useState<LocalPlan[]>([]);
  const requestIdRef = useRef(0);
  const didInitialComputeRef = useRef(false);
  const portfolioCacheRef = useRef(new Map<string, Required<Pick<PortfolioBuildPayload, "portfolio" | "simulation" | "targetPlan">> & Pick<PortfolioBuildPayload, "profile">>());

  const scenarioContext = useMemo(
    () => createScenarioInputs(goal, profileInput, inflationRate, scenarioId),
    [goal, profileInput, inflationRate, scenarioId]
  );
  const heroTarget = scenarioContext.effectiveGoal.targetAmount ?? scenarioContext.effectiveProfileInput.goalAmount;
  const hasPlan = portfolio.instruments.length > 0;
  const comparePlan = savedPlans.find((plan) => plan.id === comparePlanId) ?? null;
  const growthData = useMemo(
    () =>
      buildGrowthData(
        scenarioContext.effectiveProfileInput.horizonYears,
        scenarioContext.effectiveProfileInput.monthlySavings,
        goal.lumpSum ?? 0,
        heroTarget,
        portfolio.portfolioExpectedReturn
      ),
    [
      scenarioContext.effectiveProfileInput.horizonYears,
      scenarioContext.effectiveProfileInput.monthlySavings,
      goal.lumpSum,
      heroTarget,
      portfolio.portfolioExpectedReturn
    ]
  );
  const copilotPortfolio: CopilotPortfolioContext = {
    assets: portfolio.assets,
    allocation: portfolio.allocation,
    riskScore: (profileResult ?? portfolio.profile).riskScore,
    diversification: portfolio.diversification,
    simulation,
    instruments: portfolio.instruments,
    portfolioExpectedReturn: portfolio.portfolioExpectedReturn,
    portfolioRisk: portfolio.portfolioRisk
  };

  async function loadUserWorkspace() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    const [{ data: userRow, error: userError }, { data: profileRow }, { data: goalRow }, { data: planRows }] = await Promise.all([
      supabase.from("users").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("portfolios").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    if (userError && isMissingTableError(userError.message)) {
      setUserProfile(buildProfileFromAuthUser(user));
      setStatus("Supabase profile tables are not available yet. Running with auth metadata fallback.");
    } else if (userRow) {
      setUserProfile({
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.full_name,
        userHandle: userRow.user_handle,
        phoneNumber: userRow.phone_number
      });
    }

    if (profileRow?.raw_input) {
      setProfileInput(profileRow.raw_input as ProfileInput);
    }

    if (goalRow?.inputs) {
      const savedGoal = (
        goalRow.inputs as {
          goal?: GoalExtraction;
          targetPlan?: TargetPlanResult;
          ui?: { inflationRate?: number; scenarioId?: ScenarioId };
        }
      ).goal;
      const savedTargetPlan = (goalRow.inputs as { targetPlan?: TargetPlanResult }).targetPlan;
      const savedUi = (goalRow.inputs as { ui?: { inflationRate?: number; scenarioId?: ScenarioId } }).ui;
      if (savedGoal) setGoal(savedGoal);
      if (savedTargetPlan) setTargetPlan(savedTargetPlan);
      if (savedUi?.inflationRate !== undefined) setInflationRate(savedUi.inflationRate);
      if (savedUi?.scenarioId) setScenarioId(savedUi.scenarioId);
    }

    if (profileRow?.portfolio) {
      setPortfolio(profileRow.portfolio as PortfolioResult);
    }

    if (goalRow?.simulation) {
      setSimulation(goalRow.simulation as SimulationResponse["simulation"]);
    }

    if (planRows) {
      setSavedPlans(
        planRows.map((plan) => ({
          id: plan.id,
          userId: plan.user_id,
          planName: plan.plan_name,
          scenarioName: plan.scenario_name,
          inflationRate: Number(plan.inflation_rate),
          profileInput: (plan.portfolio as PortfolioResult).instruments.length
            ? ({
                ...profileInput,
                goalAmount: (plan.target_plan as TargetPlanResult).targetAmount,
                horizonYears: (plan.target_plan as TargetPlanResult).years
              } as ProfileInput)
            : profileInput,
          goal: {
            ...goal,
            targetAmount: (plan.target_plan as TargetPlanResult).targetAmount,
            horizonYears: (plan.target_plan as TargetPlanResult).years
          },
          portfolio: plan.portfolio as PortfolioResult,
          simulation: plan.simulation as SimulationResponse["simulation"],
          targetPlan: plan.target_plan as TargetPlanResult,
          createdAt: plan.created_at
        }))
      );
    }

    setHasWorkspaceLoaded(true);
  }

  useEffect(() => {
    setLocalPlans(loadLocalPlans());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("artha-beginner-profile");
      if (raw) {
        const parsed = JSON.parse(raw) as { profileInput?: ProfileInput; goal?: GoalExtraction };
        if (parsed.profileInput) setProfileInput(parsed.profileInput);
        if (parsed.goal) setGoal(parsed.goal);
        setIsBeginnerMode(true);
        window.localStorage.removeItem("artha-beginner-profile");
      }
      const exp = window.localStorage.getItem("artha-experience-years");
      if (exp !== null && Number(exp) < 1) setIsBeginnerMode(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let isActive = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!isActive) return;
      if (!data.user) {
        router.replace("/login");
        return;
      }
      void loadUserWorkspace();
    });

    const refreshProfile = () => {
      void loadUserWorkspace();
    };

    window.addEventListener("artha-profile-updated", refreshProfile);
    window.addEventListener("storage", refreshProfile);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      void loadUserWorkspace();
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
      window.removeEventListener("artha-profile-updated", refreshProfile);
      window.removeEventListener("storage", refreshProfile);
    };
  }, [router]);

  function updateGoalField<K extends keyof GoalExtraction>(key: K, value: GoalExtraction[K]) {
    setHasUserEdited(true);
    setGoal((prev) => ({ ...prev, [key]: value }));
  }

  function updateProfileField<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setHasUserEdited(true);
    setProfileInput((prev) => ({ ...prev, [key]: value }));
  }

  async function recomputePortfolio(nextGoal = goal, nextProfileInput = profileInput) {
    const currentRequestId = ++requestIdRef.current;
    setIsComputing(true);
    setStatus("Computing deterministic plan...");

    const scenarioInputs = createScenarioInputs(nextGoal, nextProfileInput, inflationRate, scenarioId);
    const resolvedProfileInput = scenarioInputs.effectiveProfileInput;
    const resolvedGoal = scenarioInputs.effectiveGoal;
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user }
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

    try {
      const requestBody = {
        profileInput: resolvedProfileInput,
        goal: resolvedGoal,
        targetAmount: resolvedProfileInput.goalAmount,
        years: resolvedProfileInput.horizonYears,
        monthlyContribution: resolvedProfileInput.monthlySavings,
        lumpSum: nextGoal.lumpSum ?? 0,
        userId: userProfile?.id ?? user?.id,
        inflationRate,
        scenarioId,
        persist: true
      };
      const cacheKey = JSON.stringify(requestBody);
      const cachedPayload = portfolioCacheRef.current.get(cacheKey);

      if (cachedPayload) {
        if (currentRequestId !== requestIdRef.current) return;
        const nextProfile = cachedPayload.profile ?? cachedPayload.portfolio.profile;

        setProfileResult(nextProfile);
        setPortfolio(cachedPayload.portfolio);
        setSimulation(cachedPayload.simulation);
        setTargetPlan(cachedPayload.targetPlan);
        setStatus("Plan updated from cache.");
        return;
      }

      const portfolioResponse = await fetch("/api/portfolio/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      const payload = await readJsonResponse<PortfolioBuildPayload>(portfolioResponse);

      if (!portfolioResponse.ok) {
        throw new Error(payload.details ?? payload.error ?? "Portfolio build failed.");
      }

      if (currentRequestId !== requestIdRef.current) return;
      if (!payload.portfolio || !payload.simulation || !payload.targetPlan) {
        throw new Error("Portfolio API response was missing computed plan data.");
      }

      const nextProfile = payload.profile ?? payload.portfolio.profile;
      const nextPortfolio = payload.portfolio;

      setProfileResult(nextProfile);
      setPortfolio(nextPortfolio);
      setSimulation(payload.simulation);
      setTargetPlan(payload.targetPlan);
      portfolioCacheRef.current.set(cacheKey, {
        profile: nextProfile,
        portfolio: nextPortfolio,
        simulation: payload.simulation,
        targetPlan: payload.targetPlan
      });
      if (portfolioCacheRef.current.size > 20) {
        const oldestKey = portfolioCacheRef.current.keys().next().value as string | undefined;
        if (oldestKey) portfolioCacheRef.current.delete(oldestKey);
      }

      setStatus(payload.cached ? "Plan updated from server cache." : "Plan updated across profiling, allocation, selection, diversification, and simulation.");
    } catch (error) {
      if (currentRequestId === requestIdRef.current) {
        const message = error instanceof Error ? error.message : "Unable to recompute portfolio.";
        setStatus(message);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsComputing(false);
      }
    }
  }

  useEffect(() => {
    if (!hasWorkspaceLoaded || didInitialComputeRef.current) return;
    if (!isBeginnerMode) return;
    didInitialComputeRef.current = true;
    void (async () => {
      await recomputePortfolio();
      setHasComputedOnce(true);
      setHasUserEdited(false);
    })();
  }, [hasWorkspaceLoaded, isBeginnerMode]);

  async function handleCompute() {
    await recomputePortfolio();
    setHasComputedOnce(true);
    setHasUserEdited(false);
  }

  function saveLocalPlan() {
    if (!hasComputedOnce || !hasPlan) {
      setStatus("Compute your plan first, then save it.");
      return;
    }
    if (localPlans.length >= 2) {
      setStatus("You can save at most 2 plans. Delete one to save another.");
      return;
    }
    const trimmed = planName.trim() || `Plan ${localPlans.length + 1}`;
    const last = growthData[growthData.length - 1];
    const first = growthData[0];
    const plan: LocalPlan = {
      id: `plan_${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      startCapital: first?.invested ?? 0,
      endCapital: last?.projected ?? 0,
      targetAmount: heroTarget,
      horizonYears: scenarioContext.effectiveProfileInput.horizonYears,
      monthlySavings: scenarioContext.effectiveProfileInput.monthlySavings,
      requiredMonthly: targetPlan.requiredMonthlyInvestment,
      successProbability: simulation.probabilityOfSuccess,
      expectedReturn: portfolio.portfolioExpectedReturn,
      growth: growthData,
      allocation: portfolio.allocation.current.map((slice) => ({ asset: slice.asset, weight: slice.weight }))
    };
    const next = [...localPlans, plan].slice(0, 2);
    setLocalPlans(next);
    persistLocalPlans(next);
    setStatus(`Saved "${trimmed}". ${next.length}/2 plans stored.`);
  }

  function deleteLocalPlan(id: string) {
    const next = localPlans.filter((plan) => plan.id !== id);
    setLocalPlans(next);
    persistLocalPlans(next);
    setStatus("Plan removed.");
  }

  async function explainPlan() {
    if (!hasPlan) return;
    setStatus("Generating explanation...");
    let text = "";
    const response = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: scenarioContext.effectiveGoal,
        profile: portfolio.profile,
        allocation: portfolio.allocation,
        instruments: portfolio.instruments,
        simulation,
        targetPlan
      })
    });

    await readNdjson<{ type: string; content: string }>(response, (event) => {
      if (event.type === "chunk") text += event.content;
    });

    setExplanation(text);
    setStatus("Explanation ready.");
  }

  async function askCopilot() {
    const nextMessages = [...copilotMessages, { role: "user", content: copilotDraft } as ChatMessage];
    setCopilotMessages(nextMessages);
    const question = copilotDraft;
    setCopilotDraft("");
    const response = await fetch("/api/copilot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        portfolio: copilotPortfolio
      })
    });
    const payload = (await response.json()) as { reply?: string; error?: string };
    setCopilotMessages((prev) => [
      ...prev,
      { role: "assistant", content: payload.reply ?? payload.error ?? "Copilot could not answer right now." }
    ]);
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/login");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function saveCurrentPlan() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return;

    const payload = {
      user_id: userProfile?.id ?? user.id,
      plan_name: planName,
      scenario_name: scenarioOptions.find((option) => option.id === scenarioId)?.label ?? "Base Case",
      inflation_rate: inflationRate,
      allocation: portfolio.allocation,
      portfolio,
      simulation,
      target_plan: targetPlan,
      expected_return: portfolio.portfolioExpectedReturn,
      portfolio_risk: portfolio.portfolioRisk,
      diversification: portfolio.diversification
    };

    const { data, error } = await supabase.from("portfolios").insert(payload).select("*").single();
    if (error) {
      if (isMissingTableError(error.message)) {
        setStatus("Saved plan history will be available after the Supabase schema is applied.");
        return;
      }
      setStatus(`Plan save failed: ${error.message}`);
      return;
    }

    setSavedPlans((prev) => [
      {
        id: data.id,
        userId: data.user_id,
        planName: data.plan_name,
        scenarioName: data.scenario_name,
        inflationRate: Number(data.inflation_rate),
        goal: {
          ...goal,
          targetAmount: (data.target_plan as TargetPlanResult).targetAmount,
          horizonYears: (data.target_plan as TargetPlanResult).years
        },
        profileInput: {
          ...profileInput,
          goalAmount: (data.target_plan as TargetPlanResult).targetAmount,
          horizonYears: (data.target_plan as TargetPlanResult).years
        },
        portfolio: data.portfolio as PortfolioResult,
        simulation: data.simulation as SimulationResponse["simulation"],
        targetPlan: data.target_plan as TargetPlanResult,
        createdAt: data.created_at
      },
      ...prev
    ]);
    setStatus("Current plan saved for comparison.");
  }

  return (
    <main className="page-shell">
      <section className="hero fade-in">
        <div>
          <span className="eyebrow">Investor Dashboard</span>
          <h1>{userProfile?.fullName ? `Welcome, ${userProfile.fullName.split(" ")[0]}` : "Welcome"}</h1>
          <p>
            A calmer planning workspace with clear allocation storytelling, scenario controls, and a cleaner path from
            goal setting to portfolio understanding.
          </p>
          <div className="hero-badges">
            <div className="badge">Inflation-aware planning</div>
            <div className="badge">Sector-based suggestions</div>
            <div className="badge">Saved comparisons</div>
          </div>
        </div>
        <div className="hero-metric">
          <h3>Current success probability</h3>
          <strong>{formatPercent(simulation.probabilityOfSuccess)}</strong>
          <div className="fine">Inflation-adjusted target {formatCurrency(heroTarget)}</div>
          <div className="fine">Status: {isComputing ? "Updating..." : status}</div>
          <div className="button-row" style={{ marginTop: 14 }}>
            <button className="button" onClick={handleCompute} disabled={isComputing}>
              {isComputing ? "Updating..." : hasUserEdited || !hasComputedOnce ? "Compute / Update Plan" : "Recompute"}
            </button>
            <Link className="button secondary" href="/profile">
              My Profile
            </Link>
            <button className="button secondary" onClick={signOut}>
              Sign Out
            </button>
          </div>
          {hasUserEdited && hasComputedOnce ? (
            <div className="fine" style={{ marginTop: 8, color: "#f4c95d" }}>
              Inputs changed. Click &ldquo;Compute / Update Plan&rdquo; to refresh every number below.
            </div>
          ) : null}
          {!hasComputedOnce ? (
            <div className="fine" style={{ marginTop: 8 }}>
              Fill in your details below, then hit &ldquo;Compute / Update Plan&rdquo; to see your numbers.
            </div>
          ) : null}
        </div>
      </section>

      <section className="stack section-gap">
        {hasComputedOnce ? (
          <div className="kpi-grid fade-in">
            <KpiCard
              label="How risky your plan is"
              value={`${(profileResult ?? portfolio.profile).riskScore}/100`}
              caption={(profileResult ?? portfolio.profile).riskBand}
            />
            <KpiCard label="Likely future value" value={formatCurrency(simulation.percentiles.p50)} caption="Middle-of-the-road outcome" />
            <KpiCard label="Worst rough patch" value={formatPercent(simulation.worstDrawdown)} caption="Biggest dip to expect" />
            <KpiCard label="Monthly amount to invest" value={formatCurrency(targetPlan.requiredMonthlyInvestment)} caption="To reach your goal" />
            <KpiCard label="Spread across investments" value={`${portfolio.diversification.score}/100`} caption={portfolio.diversification.interpretation} />
            <KpiCard label="Chance of hitting goal" value={formatPercent(simulation.probabilityOfSuccess)} caption="Based on 10,000 simulations" />
          </div>
        ) : (
          <div className="panel fade-in">
            <div className="panel-header">
              <h2>Your numbers will appear here</h2>
            </div>
            <div className="panel-copy">
              Nothing is calculated yet. Adjust the inputs below &mdash; risk level, savings, goal &mdash; then click
              <strong> Compute / Update Plan</strong> at the top to see your personalised dashboard.
            </div>
          </div>
        )}
      </section>

      <section className="grid section-gap">
        <div className="stack">
          <div className="panel fade-in">
            <div className="panel-header">
              <h2>Goal Planning</h2>
              <div className="button-row">
                <button className="button secondary" onClick={explainPlan}>
                  Explain Plan
                </button>
              </div>
            </div>
            <div className="panel-copy">
              Adjust your target, duration, inflation, and scenario assumptions. The existing planning engine recalculates the plan in real time.
            </div>
            {goal.contradictions.length > 0 ? (
              <div className="callout">
                <strong>Contradictions detected</strong>
                <div>{goal.contradictions.join(" ")}</div>
              </div>
            ) : null}
            <div className="field-grid">
              <div className="field">
                <label>Goal type</label>
                <select value={goal.goalType} onChange={(event) => updateGoalField("goalType", event.target.value as GoalType)}>
                  {goalOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Target amount (INR)</label>
                <input
                  type="number"
                  value={goal.targetAmount ?? profileInput.goalAmount}
                  onChange={(event) => {
                    const amount = Number(event.target.value);
                    updateGoalField("targetAmount", amount);
                    updateProfileField("goalAmount", amount);
                  }}
                />
              </div>
              <div className="field">
                <label>Time horizon (years)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={goal.horizonYears ?? profileInput.horizonYears}
                  onChange={(event) => {
                    const years = Number(event.target.value);
                    updateGoalField("horizonYears", years);
                    updateProfileField("horizonYears", years as ProfileInput["horizonYears"]);
                  }}
                />
              </div>
              <div className="field">
                <label>Lump sum (INR)</label>
                <input
                  type="number"
                  value={goal.lumpSum ?? 0}
                  onChange={(event) => updateGoalField("lumpSum", Number(event.target.value))}
                />
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label>Inflation adjustment</label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={inflationRate}
                  onChange={(event) => {
                    setHasUserEdited(true);
                    setInflationRate(Number(event.target.value));
                  }}
                />
                <div className="fine">{inflationRate}% annual inflation assumption</div>
              </div>
              <div className="field">
                <label>What-if scenario</label>
                <select
                  value={scenarioId}
                  onChange={(event) => {
                    setHasUserEdited(true);
                    setScenarioId(event.target.value as ScenarioId);
                  }}
                >
                  {scenarioOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="fine">Small assumption changes instantly update allocation, suggestions, and outcomes.</div>
              </div>
            </div>
            <div className="range-wrap">
              <div className="fine">Select Investment Duration (Years)</div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={goal.horizonYears ?? profileInput.horizonYears}
                onChange={(event) => {
                  const years = Number(event.target.value);
                  updateGoalField("horizonYears", years);
                  updateProfileField("horizonYears", years as ProfileInput["horizonYears"]);
                }}
              />
              <div className="inline-stat">
                <span>Selected duration</span>
                <strong>{goal.horizonYears ?? profileInput.horizonYears} years</strong>
              </div>
              <div className="inline-stat">
                <span>Inflation-adjusted target</span>
                <strong>{formatCurrency(scenarioContext.inflatedTarget)}</strong>
              </div>
              <div className="inline-stat">
                <span>Target planning</span>
                <strong>{targetPlan.message}</strong>
              </div>
            </div>
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h2>How your money can grow</h2>
            </div>
            <div className="panel-copy">
              Projected path of invested capital, target path, and estimated growth under the current plan assumptions.
            </div>
            {hasComputedOnce && hasPlan ? <PortfolioGrowthChart data={growthData} /> : <div className="panel-copy">The growth chart appears once you compute your plan.</div>}
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h2>How your money is split</h2>
            </div>
            <div className="panel-copy">
              A simple, readable view of how the plan is distributed across growth, stability, diversification, and liquidity.
            </div>
            {hasComputedOnce && hasPlan ? (
              <div className="panel-body">
                <AllocationBreakdown allocation={portfolio.allocation} instruments={portfolio.instruments} />
              </div>
            ) : (
              <div className="panel-copy">
                The split (growth, stable, diversifier, cash) will appear once you click <strong>Compute / Update Plan</strong>. Every
                percentage recalculates from your actual inputs.
              </div>
            )}
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h2>Your plan at a glance</h2>
            </div>
            <div className="panel-copy">
              Walk through Goal, Risk, Allocation, Funds, and Simulation without leaving the dashboard.
            </div>
            {hasComputedOnce && hasPlan ? (
              <InvestmentCanvas
                goal={scenarioContext.effectiveGoal}
                portfolio={portfolio}
                simulation={simulation}
                targetPlan={targetPlan}
              />
            ) : (
              <div className="panel-copy">The interactive map activates after you compute your plan.</div>
            )}
          </div>
        </div>

        <div className="stack">
          <div className="panel fade-in">
            <div className="panel-header">
              <h3>About You</h3>
            </div>
            <div className="field-grid">
              {(
                [
                  ["age", "Your age"],
                  ["annualIncome", "Your yearly income (INR)"],
                  ["monthlySavings", "What you save each month (INR)"],
                  ["riskPreference", "How much risk you're OK with (1 = play safe, 5 = go big)"],
                  ["emergencyMonths", "Emergency cushion (months of expenses saved)"],
                  ["dependents", "People depending on your income"],
                  ["investmentExperience", "How experienced you feel (1 = brand new, 5 = expert)"],
                  ["drawdownTolerance", "Handling a big dip (1 = scary, 5 = no problem)"],
                  ["incomeStability", "How steady is your income (1 = shaky, 5 = rock solid)"],
                  ["goalFlexibility", "Can your goal shift in time (1 = fixed date, 5 = flexible)"]
                ] as const
              ).map(([key, label]) => (
                <div className="field" key={key}>
                  <label>{label}</label>
                  <input
                    type="number"
                    value={profileInput[key]}
                    onChange={(event) =>
                      updateProfileField(key, Number(event.target.value) as ProfileInput[typeof key])
                    }
                  />
                </div>
              ))}
              <div className="field">
                <label>If your money dropped 20%, you&apos;d...</label>
                <select
                  value={profileInput.reactionToLoss}
                  onChange={(event) =>
                    updateProfileField("reactionToLoss", event.target.value as ProfileInput["reactionToLoss"])
                  }
                >
                  <option value="panic">Panic and sell</option>
                  <option value="concerned">Feel worried but hold</option>
                  <option value="steady">Stay calm, maybe buy more</option>
                </select>
              </div>
            </div>
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Suggested buckets (not stock tips)</h3>
            </div>
            <div className="panel-copy">
              Clear portfolio sleeves instead of individual stock names, making the plan easier to understand and explain.
            </div>
            {hasComputedOnce && hasPlan ? (
              <div className="suggestion-grid">
                {portfolio.instruments.map((instrument) => (
                  <SuggestionCard key={`${instrument.schemeId}-${instrument.categoryLabel}`} instrument={instrument} />
                ))}
              </div>
            ) : (
              <div className="panel-copy">Fund suggestions appear after you compute your plan.</div>
            )}
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Risk vs Return of your picks</h3>
            </div>
            <div className="panel-copy">
              Each dot is one fund in your plan. Further right = bumpier ride. Higher up = bigger expected return. Bigger
              dot = larger share of your money.
            </div>
            {hasComputedOnce && hasPlan ? (
              <RiskReturnChart instruments={portfolio.instruments} />
            ) : (
              <div className="panel-copy">Compute your plan to see the risk/return map.</div>
            )}
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Basic market insights</h3>
            </div>
            <div className="panel-copy">
              Plain-English takeaways about what your plan is doing, rebuilt every time you recompute.
            </div>
            {hasComputedOnce && hasPlan ? (
              <MarketInsights
                instruments={portfolio.instruments}
                allocation={portfolio.allocation.current}
                profile={profileResult ?? portfolio.profile}
                horizonYears={scenarioContext.effectiveProfileInput.horizonYears}
              />
            ) : (
              <div className="panel-copy">Insights appear after you compute your plan.</div>
            )}
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Are you saving enough?</h3>
            </div>
            <div className="panel-copy">
              {hasComputedOnce ? (
                <>
                  {targetPlan.message}
                  <div className="inline-stat">
                    <span>What you save today</span>
                    <strong>{formatCurrency(targetPlan.currentMonthlyInvestment)}</strong>
                  </div>
                  <div className="inline-stat">
                    <span>What you really need to save each month</span>
                    <strong>{formatCurrency(targetPlan.requiredMonthlyInvestment)}</strong>
                  </div>
                  <div className="inline-stat">
                    <span>Gap to close</span>
                    <strong>{formatCurrency(targetPlan.gapToRequiredSip)}</strong>
                  </div>
                </>
              ) : (
                <>Enter your goal and monthly savings, then compute the plan to see if you&apos;re on track.</>
              )}
            </div>
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Save &amp; Compare Plans</h3>
              <span className="fine">{localPlans.length}/2 saved</span>
            </div>
            <div className="panel-copy">
              <div className="field">
                <label>Plan name</label>
                <input value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder="e.g. Safe plan, Aggressive plan" />
              </div>
              <div className="button-row" style={{ marginTop: 14 }}>
                <button
                  className="button"
                  onClick={saveLocalPlan}
                  disabled={!hasComputedOnce || !hasPlan || localPlans.length >= 2}
                >
                  {localPlans.length >= 2 ? "Limit reached (2/2)" : "Save Current Plan"}
                </button>
              </div>
              {!hasComputedOnce ? (
                <div className="fine" style={{ marginTop: 10 }}>
                  Compute your plan first (button at the top), then come back and save it.
                </div>
              ) : null}

              {localPlans.length > 0 ? (
                <div className="stack" style={{ marginTop: 16 }}>
                  {localPlans.map((plan, index) => (
                    <div className="comparison-card" key={plan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                      <div>
                        <strong>
                          Plan {index + 1}: {plan.name}
                        </strong>
                        <div className="fine">
                          Target {formatCurrency(plan.targetAmount)} in {plan.horizonYears}y &middot; SIP {formatCurrency(plan.monthlySavings)} &middot; Success {formatPercent(plan.successProbability)}
                        </div>
                      </div>
                      <button className="button secondary" onClick={() => deleteLocalPlan(plan.id)} type="button">
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {localPlans.length === 2 ? (
                <div className="stack" style={{ marginTop: 18 }}>
                  <h4 style={{ margin: 0 }}>Comparison: {localPlans[0].name} vs {localPlans[1].name}</h4>
                  <div className="comparison-grid">
                    <div className="comparison-card">
                      <span>{localPlans[0].name}</span>
                      <strong>{formatCurrency(localPlans[0].endCapital)}</strong>
                      <p className="fine">
                        Start: {formatCurrency(localPlans[0].startCapital)}
                        <br />End ({localPlans[0].horizonYears}y): {formatCurrency(localPlans[0].endCapital)}
                        <br />Success: {formatPercent(localPlans[0].successProbability)}
                        <br />Required SIP: {formatCurrency(localPlans[0].requiredMonthly)}
                      </p>
                    </div>
                    <div className="comparison-card">
                      <span>{localPlans[1].name}</span>
                      <strong>{formatCurrency(localPlans[1].endCapital)}</strong>
                      <p className="fine">
                        Start: {formatCurrency(localPlans[1].startCapital)}
                        <br />End ({localPlans[1].horizonYears}y): {formatCurrency(localPlans[1].endCapital)}
                        <br />Success: {formatPercent(localPlans[1].successProbability)}
                        <br />Required SIP: {formatCurrency(localPlans[1].requiredMonthly)}
                      </p>
                    </div>
                  </div>
                  <div className="fine" style={{ marginTop: 6 }}>How your money grows under each plan</div>
                  <ComparisonGrowthChart
                    planA={{ name: localPlans[0].name, growth: localPlans[0].growth }}
                    planB={{ name: localPlans[1].name, growth: localPlans[1].growth }}
                  />
                  <div className="fine">
                    Winner by ending capital:{" "}
                    <strong>
                      {localPlans[0].endCapital >= localPlans[1].endCapital ? localPlans[0].name : localPlans[1].name}
                    </strong>{" "}
                    by {formatCurrency(Math.abs(localPlans[0].endCapital - localPlans[1].endCapital))}
                  </div>
                </div>
              ) : (
                <div className="fine" style={{ marginTop: 12 }}>
                  Save two different plans (e.g. change your risk or savings, recompute, save again) to see them charted side by side.
                </div>
              )}
            </div>
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Copilot Chat</h3>
            </div>
            <div className="copilot-feed">
              {copilotMessages.map((message, index) => (
                <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="composer">
              <textarea rows={3} value={copilotDraft} onChange={(event) => setCopilotDraft(event.target.value)} />
              <div className="button-row">
                <button className="button" onClick={askCopilot}>
                  Ask Copilot
                </button>
              </div>
            </div>
          </div>

          <div className="panel fade-in">
            <div className="panel-header">
              <h3>Portfolio Explanation</h3>
            </div>
            <div className="panel-copy">{explanation || "Use Explain Plan to generate a plain-language explanation."}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
