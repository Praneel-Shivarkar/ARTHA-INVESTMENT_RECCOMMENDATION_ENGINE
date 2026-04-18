import { AllocationResult, AllocationSlice, RiskBand } from "@/lib/types";
import { round2 } from "@/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeWeights(weights: AllocationSlice[]) {
  const total = weights.reduce((acc, slice) => acc + slice.weight, 0) || 100;
  return weights.map((slice) => ({
    ...slice,
    weight: round2((slice.weight / total) * 100)
  }));
}

function deriveEquityWeight(riskScore: number, horizonYears: number, riskPreference: number) {
  const base = 12 + (riskScore / 100) * 68;
  const preferenceAdj = (riskPreference - 3) * 3.5;
  const horizonAdj = (horizonYears - 7) * 1.25;
  const equityWeight = base + preferenceAdj + horizonAdj;
  return clamp(round2(equityWeight), 10, 90);
}

function buildCurrentAllocation(
  equityWeight: number,
  horizonYears: number,
  riskScore: number,
  emergencyMonths: number
): AllocationSlice[] {
  const remaining = Math.max(100 - equityWeight, 5);

  const cashBase = horizonYears < 3 ? 14 : horizonYears < 5 ? 10 : horizonYears <= 10 ? 6 : 4;
  const cashBuffer = emergencyMonths < 3 ? 4 : emergencyMonths < 6 ? 2 : 0;
  const cashWeight = clamp(round2(cashBase + cashBuffer - (riskScore / 100) * 2), 2, 20);

  const goldBase = horizonYears > 10 ? 11 : horizonYears > 5 ? 9 : 7;
  const goldWeight = clamp(round2(goldBase + (riskScore > 70 ? -1.5 : riskScore < 40 ? 1.5 : 0)), 3, 15);

  const debtWeight = Math.max(round2(remaining - goldWeight - cashWeight), 3);

  return normalizeWeights([
    { asset: "equity", weight: equityWeight },
    { asset: "debt", weight: debtWeight },
    { asset: "gold", weight: goldWeight },
    { asset: "cash", weight: cashWeight }
  ]);
}

function glideWeights(current: AllocationSlice[], yearsRemaining: number) {
  const equityStepDown = yearsRemaining <= 3 ? 16 : yearsRemaining <= 5 ? 10 : yearsRemaining <= 8 ? 5 : 0;

  return normalizeWeights(
    current.map((slice) => {
      if (slice.asset === "equity") return { ...slice, weight: slice.weight - equityStepDown };
      if (slice.asset === "debt") return { ...slice, weight: slice.weight + equityStepDown * 0.7 };
      if (slice.asset === "cash") return { ...slice, weight: slice.weight + equityStepDown * 0.2 };
      return { ...slice, weight: slice.weight + equityStepDown * 0.1 };
    })
  );
}

export function buildAllocation(
  riskBand: RiskBand,
  riskScore: number,
  horizonYears: number,
  riskPreference: number,
  emergencyMonths = 6
): AllocationResult {
  const current = buildCurrentAllocation(
    deriveEquityWeight(riskScore, horizonYears, riskPreference),
    horizonYears,
    riskScore,
    emergencyMonths
  );
  const glidePath = Array.from({ length: Math.max(horizonYears, 1) }, (_, index) => {
    const year = index + 1;
    const yearsRemaining = Math.max(horizonYears - index, 1);
    return {
      year,
      weights: glideWeights(current, yearsRemaining)
    };
  });

  return {
    riskBand,
    current,
    glidePath
  };
}
