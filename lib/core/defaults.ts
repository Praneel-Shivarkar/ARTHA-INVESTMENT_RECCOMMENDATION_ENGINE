import {
  GoalExtraction,
  MonteCarloResult,
  PortfolioResult,
  ProfileInput,
  TargetPlanResult
} from "@/lib/types";

export function createInitialProfileInput(): ProfileInput {
  return {
    age: 30,
    annualIncome: 1200000,
    monthlySavings: 25000,
    goalAmount: 5000000,
    horizonYears: 10,
    riskPreference: 3,
    emergencyMonths: 6,
    dependents: 0,
    investmentExperience: 3,
    drawdownTolerance: 3,
    incomeStability: 3,
    goalFlexibility: 3,
    reactionToLoss: "concerned"
  };
}

export function createInitialGoal(): GoalExtraction {
  return {
    goalType: "Unknown",
    targetAmount: null,
    horizonYears: null,
    monthlyContribution: null,
    lumpSum: 0,
    emotionalWeight: "medium",
    contradictions: [],
    summary: "Start by entering your real goal inputs."
  };
}

export function createEmptyPortfolio(): PortfolioResult {
  return {
    profile: {
      riskScore: 0,
      riskBand: "Conservative",
      behavioralFlags: {
        panicSeller: false,
        overconfident: false,
        thinEmergencyBuffer: false,
        shortHorizonPressure: false
      },
      rationale: ["Portfolio will be computed once real inputs are submitted."]
    },
    assets: [],
    allocation: {
      riskBand: "Conservative",
      current: [],
      glidePath: []
    },
    instruments: [],
    diversification: {
      score: 0,
      interpretation: "Concentrated"
    },
    portfolioExpectedReturn: 0,
    portfolioRisk: 0,
    expectedReturnRange: {
      low: 0,
      base: 0,
      high: 0
    }
  };
}

export function createEmptySimulation(): MonteCarloResult {
  return {
    simulations: 0,
    percentiles: {
      p5: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p95: 0
    },
    probabilityOfSuccess: 0,
    worstDrawdown: 0,
    medianTerminalValue: 0,
    sampledTerminalValues: []
  };
}

export function createEmptyTargetPlan(): TargetPlanResult {
  return {
    targetAmount: 0,
    years: 0,
    currentMonthlyInvestment: 0,
    requiredMonthlyInvestment: 0,
    successProbability: 0,
    gapToRequiredSip: 0,
    message: "Set a target amount and duration to see the required SIP."
  };
}
