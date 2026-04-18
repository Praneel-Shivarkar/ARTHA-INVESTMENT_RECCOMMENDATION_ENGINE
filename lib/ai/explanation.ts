import { getOpenAIClient } from "@/lib/ai/client";
import { SYSTEM_BOUNDARY_PROMPT } from "@/lib/ai/prompts";
import { ExplainPayload } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

function buildFallbackExplanation(payload: ExplainPayload) {
  const topFunds = payload.instruments
    .slice(0, 3)
    .map((instrument) => `${instrument.name} (${instrument.weight}%)`)
    .join(", ");
  const simulationText = payload.simulation
    ? `The simulation median outcome is ${formatCurrency(payload.simulation.percentiles.p50)} with ${formatPercent(
        payload.simulation.probabilityOfSuccess
      )} success probability.`
    : "Simulation has not been run yet.";
  const planningText = payload.targetPlan
    ? `The current plan calls for ${formatCurrency(payload.targetPlan.requiredMonthlyInvestment)} per month.`
    : "";

  return [
    `Your goal is classified as ${payload.goal.goalType} with a ${payload.profile.riskBand.toLowerCase()} risk posture.`,
    `The deterministic engine assigned a risk score of ${payload.profile.riskScore} and mapped that to ${
      payload.allocation.current[0]?.weight ?? 0
    }% equity, ${payload.allocation.current[1]?.weight ?? 0}% debt, ${
      payload.allocation.current[2]?.weight ?? 0
    }% gold, and ${payload.allocation.current[3]?.weight ?? 0}% cash.`,
    `Selected funds include ${topFunds}.`,
    simulationText,
    planningText
  ].join(" ");
}

export async function explainPortfolio(payload: ExplainPayload) {
  const fallback = buildFallbackExplanation(payload);
  const client = getOpenAIClient();

  if (!client) return fallback;

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input: [
        { role: "system", content: SYSTEM_BOUNDARY_PROMPT },
        {
          role: "user",
          content:
            "Explain this deterministic portfolio to an Indian retail investor in simple language. Do not change any numbers. Keep it under 220 words.\n\n" +
            JSON.stringify(payload)
        }
      ]
    });
    return response.output_text || fallback;
  } catch {
    return fallback;
  }
}
