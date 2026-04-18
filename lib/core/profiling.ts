import { BehavioralFlags, ProfileInput, ProfileResult, RiskBand } from "@/lib/types";
import { clamp } from "@/lib/utils";

function classifyRiskBand(riskScore: number): RiskBand {
  if (riskScore < 35) return "Conservative";
  if (riskScore < 55) return "Balanced";
  if (riskScore < 75) return "Growth";
  return "Aggressive";
}

function buildBehavioralFlags(input: ProfileInput): BehavioralFlags {
  return {
    panicSeller: input.reactionToLoss === "panic",
    overconfident: input.investmentExperience >= 4 && input.drawdownTolerance >= 4 && input.goalFlexibility <= 2,
    thinEmergencyBuffer: input.emergencyMonths < 6,
    shortHorizonPressure: input.horizonYears < 4 && input.drawdownTolerance >= 4
  };
}

export function computeRiskProfile(input: ProfileInput): ProfileResult {
  const ageScore = clamp((60 - input.age) * 1.4, 0, 20);
  const horizonScore = clamp(input.horizonYears * 3.2, 0, 24);
  const capacityScore = clamp((input.monthlySavings / Math.max(input.annualIncome / 12, 1)) * 30, 0, 16);
  const goalPressurePenalty = input.goalAmount > input.annualIncome * input.horizonYears ? 5 : 0;
  const preferenceScore = input.riskPreference * 5;
  const toleranceScore = input.drawdownTolerance * 6;
  const stabilityScore = input.incomeStability * 4;
  const experienceScore = input.investmentExperience * 3;
  const liquidityPenalty = input.emergencyMonths < 6 ? 7 : 0;
  const dependentsPenalty = Math.min(input.dependents * 2, 8);
  const panicPenalty = input.reactionToLoss === "panic" ? 10 : input.reactionToLoss === "concerned" ? 4 : 0;

  const rawScore =
    ageScore +
    horizonScore +
    capacityScore +
    preferenceScore +
    toleranceScore +
    stabilityScore +
    experienceScore -
    goalPressurePenalty -
    liquidityPenalty -
    dependentsPenalty -
    panicPenalty;

  const riskScore = clamp(Math.round(rawScore), 0, 100);
  const behavioralFlags = buildBehavioralFlags(input);
  const riskBand = classifyRiskBand(riskScore);

  const rationale = [
    `${input.horizonYears}-year horizon contributes ${Math.round(horizonScore)} points to risk capacity.`,
    `Explicit risk preference adds ${preferenceScore} points to the score.`,
    `Monthly savings rate and income stability support a ${riskBand.toLowerCase()} posture.`,
    behavioralFlags.thinEmergencyBuffer
      ? "Emergency buffer is below six months, so the score is intentionally capped lower."
      : "Emergency liquidity is healthy, so no liquidity penalty was applied.",
    behavioralFlags.panicSeller
      ? "Loss reaction indicates panic selling risk; guardrails should reduce equity concentration."
      : "Loss reaction does not indicate forced risk reduction."
  ];

  return {
    riskScore,
    riskBand,
    behavioralFlags,
    rationale
  };
}
