import { runMonteCarloSimulation } from "@/lib/core/monte_carlo";
import { MonteCarloInput, TargetPlanResult } from "@/lib/types";
import { round2 } from "@/lib/utils";

function cloneInput(input: MonteCarloInput, monthlyContribution: number, simulations: number): MonteCarloInput {
  return {
    ...input,
    monthlyContribution,
    simulations
  };
}

export function computeTargetPlan(
  input: MonteCarloInput,
  successProbability: number,
  targetSuccess = 75
): TargetPlanResult {
  let low = 0;
  let high = Math.max(input.targetAmount / Math.max(input.years * 12, 1), input.monthlyContribution * 3, 5000);

  while (
    runMonteCarloSimulation(cloneInput(input, high, 2000)).probabilityOfSuccess < targetSuccess &&
    high < input.targetAmount
  ) {
    high *= 1.5;
  }

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const mid = (low + high) / 2;
    const result = runMonteCarloSimulation(cloneInput(input, mid, 2000));
    if (result.probabilityOfSuccess >= targetSuccess) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const requiredMonthlyInvestment = round2(high);
  const gapToRequiredSip = round2(Math.max(requiredMonthlyInvestment - input.monthlyContribution, 0));

  return {
    targetAmount: input.targetAmount,
    years: input.years,
    currentMonthlyInvestment: input.monthlyContribution,
    requiredMonthlyInvestment,
    successProbability,
    gapToRequiredSip,
    message:
      gapToRequiredSip <= 0
        ? `To reach the target in ${input.years} years, the current monthly investment is already sufficient.`
        : `To reach the target in ${input.years} years, invest ${requiredMonthlyInvestment.toFixed(0)} per month.`
  };
}
