import { DiversificationResult } from "@/lib/types";
import { round2 } from "@/lib/utils";

export function computeDiversification(weights: number[]): DiversificationResult {
  const normalized = weights.map((weight) => weight / 100);
  const hhi = normalized.reduce((acc, weight) => acc + weight ** 2, 0);
  const score = round2((1 - hhi) * 100);

  if (score >= 70) {
    return { score, interpretation: "Highly Diversified" };
  }
  if (score >= 45) {
    return { score, interpretation: "Moderately Diversified" };
  }
  return { score, interpretation: "Concentrated" };
}
