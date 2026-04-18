import { MonteCarloInput, MonteCarloResult } from "@/lib/types";
import { average, percentile, round2 } from "@/lib/utils";

function randomGaussian() {
  const u1 = Math.max(Math.random(), 1e-9);
  const u2 = Math.max(Math.random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function annualToMonthlyMean(annualReturn: number) {
  return Math.pow(1 + annualReturn / 100, 1 / 12) - 1;
}

function annualToMonthlySigma(annualVolatility: number) {
  return annualVolatility / 100 / Math.sqrt(12);
}

function meanFromMonthlyReturns(monthlyReturns: number[]) {
  return average(monthlyReturns) / 100;
}

function sigmaFromMonthlyReturns(monthlyReturns: number[]) {
  const mean = average(monthlyReturns);
  const variance =
    monthlyReturns.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(monthlyReturns.length, 1);
  return Math.sqrt(variance) / 100;
}

function instrumentStats(instrument: MonteCarloInput["instruments"][number]) {
  const monthlyMean =
    instrument.expectedAnnualReturn !== undefined
      ? annualToMonthlyMean(instrument.expectedAnnualReturn)
      : meanFromMonthlyReturns(instrument.monthlyReturns);

  const monthlySigma =
    instrument.annualVolatility !== undefined
      ? annualToMonthlySigma(instrument.annualVolatility)
      : sigmaFromMonthlyReturns(instrument.monthlyReturns);

  return {
    weight: instrument.weight / 100,
    mean: monthlyMean,
    sigma: monthlySigma
  };
}

export function runMonteCarloSimulation(input: MonteCarloInput): MonteCarloResult {
  const totalMonths = input.years * 12;
  const simulations = input.simulations ?? 2000;
  const stats = input.instruments.map(instrumentStats);
  const terminalValues: number[] = [];
  let successes = 0;
  let worstDrawdown = 0;

  for (let run = 0; run < simulations; run += 1) {
    let portfolioValue = input.lumpSum;
    let peak = Math.max(portfolioValue, 1);
    let maxDrawdown = 0;

    for (let month = 0; month < totalMonths; month += 1) {
      portfolioValue += input.monthlyContribution;

      let portfolioReturn = 0;
      for (let index = 0; index < stats.length; index += 1) {
        const instrument = stats[index];
        const simulatedReturn = instrument.mean + instrument.sigma * randomGaussian();
        portfolioReturn += simulatedReturn * instrument.weight;
      }

      portfolioValue *= 1 + portfolioReturn;

      peak = Math.max(peak, portfolioValue);
      const drawdown = peak === 0 ? 0 : ((peak - portfolioValue) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    if (portfolioValue >= input.targetAmount) {
      successes += 1;
    }

    worstDrawdown = Math.max(worstDrawdown, maxDrawdown);
    terminalValues.push(round2(portfolioValue));
  }

  const sorted = [...terminalValues].sort((a, b) => a - b);
  const sampleStep = Math.max(1, Math.floor(sorted.length / 50));

  return {
    simulations,
    percentiles: {
      p5: round2(percentile(sorted, 0.05)),
      p25: round2(percentile(sorted, 0.25)),
      p50: round2(percentile(sorted, 0.5)),
      p75: round2(percentile(sorted, 0.75)),
      p95: round2(percentile(sorted, 0.95))
    },
    probabilityOfSuccess: round2((successes / simulations) * 100),
    worstDrawdown: round2(worstDrawdown),
    medianTerminalValue: round2(percentile(sorted, 0.5)),
    sampledTerminalValues: sorted.filter((_, index) => index % sampleStep === 0).slice(0, 50)
  };
}
