import { computeRiskProfile } from "@/lib/core/profiling";
import { computeDiversification } from "@/lib/core/diversification";
import { selectPortfolio } from "@/lib/core/selector";
import { MonteCarloInput, PortfolioResult, ProfileInput } from "@/lib/types";
import { round2 } from "@/lib/utils";

function expectedReturnRangeFromPortfolio(portfolio: PortfolioResult["instruments"]) {
  const weightedScore = portfolio.reduce((acc, item) => acc + item.score * (item.weight / 100), 0);
  return {
    low: Number((6 + weightedScore * 0.03).toFixed(2)),
    base: Number((9 + weightedScore * 0.04).toFixed(2)),
    high: Number((12 + weightedScore * 0.05).toFixed(2))
  };
}

export async function buildPortfolioFromInputs(profileInput: ProfileInput) {
  const profile = computeRiskProfile(profileInput);
  const { allocation, instruments } = await selectPortfolio(profile, profileInput);
  const expectedReturnRange = expectedReturnRangeFromPortfolio(instruments);
  const diversification = computeDiversification(instruments.map((instrument) => instrument.weight));
  const portfolioExpectedReturn = round2(
    instruments.reduce((acc, instrument) => acc + instrument.expectedReturn * (instrument.weight / 100), 0)
  );
  const portfolioRisk = round2(
    instruments.reduce((acc, instrument) => acc + instrument.risk * (instrument.weight / 100), 0)
  );

  const portfolio: PortfolioResult = {
    profile,
    assets: allocation.current,
    allocation,
    instruments,
    diversification,
    portfolioExpectedReturn,
    portfolioRisk,
    expectedReturnRange
  };

  return portfolio;
}

export function buildMonteCarloInput(input: {
  portfolio: PortfolioResult;
  targetAmount: number;
  years: number;
  monthlyContribution: number;
  lumpSum: number;
}): MonteCarloInput {
  return {
    targetAmount: input.targetAmount,
    years: input.years,
    monthlyContribution: input.monthlyContribution,
    lumpSum: input.lumpSum,
    portfolioWeights: input.portfolio.allocation.current,
    instruments: input.portfolio.instruments.map((instrument) => ({
      name: instrument.name,
      weight: instrument.weight,
      monthlyReturns: instrument.returnSeries.length ? instrument.returnSeries : [0.5],
      expectedAnnualReturn: instrument.expectedReturn,
      annualVolatility: instrument.risk
    }))
  };
}
