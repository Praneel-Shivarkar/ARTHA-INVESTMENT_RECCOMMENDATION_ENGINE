import { GoalExtraction, PortfolioResult, ProfileInput } from "@/lib/types";

export const demoProfileInput: ProfileInput = {
  age: 29,
  annualIncome: 2400000,
  monthlySavings: 55000,
  goalAmount: 15000000,
  horizonYears: 12,
  riskPreference: 4,
  emergencyMonths: 8,
  dependents: 1,
  investmentExperience: 3,
  drawdownTolerance: 4,
  incomeStability: 4,
  goalFlexibility: 3,
  reactionToLoss: "concerned"
};

export const demoGoal: GoalExtraction = {
  goalType: "Wealth Creation",
  targetAmount: 15000000,
  horizonYears: 12,
  monthlyContribution: 55000,
  lumpSum: 200000,
  emotionalWeight: "high",
  contradictions: [],
  summary: "Build a 1.5 crore corpus over 12 years without taking reckless concentration risk."
};

export function expectedReturnRangeFromPortfolio(portfolio: PortfolioResult["instruments"]) {
  const weightedScore = portfolio.reduce((acc, item) => acc + item.score * (item.weight / 100), 0);
  return {
    low: Number((6 + weightedScore * 0.03).toFixed(2)),
    base: Number((9 + weightedScore * 0.04).toFixed(2)),
    high: Number((12 + weightedScore * 0.05).toFixed(2))
  };
}
