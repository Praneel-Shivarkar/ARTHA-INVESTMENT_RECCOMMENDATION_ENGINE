import { z } from "zod";

import { getOpenAIClient } from "@/lib/ai/client";
import { SYSTEM_BOUNDARY_PROMPT } from "@/lib/ai/prompts";
import { ChatMessage, GoalExtraction, GoalType } from "@/lib/types";

const extractionSchema = z.object({
  goalType: z
    .enum([
      "Retirement",
      "Wealth Creation",
      "Child Education",
      "Emergency Corpus",
      "Home Purchase",
      "Vacation",
      "Unknown"
    ])
    .catch("Unknown"),
  targetAmount: z.number().nullable(),
  horizonYears: z.number().nullable(),
  monthlyContribution: z.number().nullable(),
  lumpSum: z.number().nullable(),
  emotionalWeight: z.enum(["low", "medium", "high"]).catch("medium"),
  summary: z.string().default("Goal extracted from onboarding chat.")
});

function inferGoalType(text: string): GoalType {
  const lower = text.toLowerCase();
  if (lower.includes("retire")) return "Retirement";
  if (lower.includes("education") || lower.includes("college")) return "Child Education";
  if (lower.includes("emergency")) return "Emergency Corpus";
  if (lower.includes("house") || lower.includes("home")) return "Home Purchase";
  if (lower.includes("vacation") || lower.includes("travel")) return "Vacation";
  if (lower.includes("wealth") || lower.includes("corpus")) return "Wealth Creation";
  return "Unknown";
}

function extractCurrency(text: string) {
  const amountMatch =
    text.match(/(?:rs|inr|₹)\s?([\d,]+(?:\.\d+)?)(?:\s?(lakh|lakhs|crore|crores))?/i) ??
    text.match(/([\d,]+(?:\.\d+)?)\s?(lakh|lakhs|crore|crores)/i);
  if (!amountMatch) return null;
  const raw = Number(amountMatch[1]!.replaceAll(",", ""));
  const unit = amountMatch[2]?.toLowerCase();
  if (!unit) return raw;
  if (unit.startsWith("lakh")) return raw * 100000;
  if (unit.startsWith("crore")) return raw * 10000000;
  return raw;
}

function extractYears(text: string) {
  const match = text.match(/(\d+)\s*(year|years|yr|yrs)/i);
  return match ? Number(match[1]) : null;
}

function extractMonthlyContribution(text: string) {
  const match = text.match(/(?:sip|monthly|per month)\D*([\d,]+(?:\.\d+)?)/i);
  return match ? Number(match[1]!.replaceAll(",", "")) : null;
}

function extractLumpSum(text: string) {
  const match = text.match(/(?:lump\s?sum|already have|starting with|invest now)\D*([\d,]+(?:\.\d+)?)/i);
  return match ? Number(match[1]!.replaceAll(",", "")) : null;
}

function extractEmotionalWeight(text: string): GoalExtraction["emotionalWeight"] {
  const lower = text.toLowerCase();
  if (lower.includes("must") || lower.includes("non negotiable") || lower.includes("critical")) return "high";
  if (lower.includes("nice to have") || lower.includes("optional")) return "low";
  return "medium";
}

function detectContradictions(text: string, horizonYears: number | null, targetAmount: number | null) {
  const contradictions: string[] = [];
  const lower = text.toLowerCase();
  if (horizonYears !== null && horizonYears <= 3 && lower.includes("retire")) {
    contradictions.push("Retirement goal is marked very short-term; horizon may be inconsistent.");
  }
  if (targetAmount !== null && targetAmount >= 10000000 && horizonYears !== null && horizonYears <= 5) {
    contradictions.push("Large target with short horizon may require unrealistic contribution levels.");
  }
  if (lower.includes("no risk") && lower.includes("highest return")) {
    contradictions.push("User wants both no risk and highest return.");
  }
  return contradictions;
}

export async function extractGoalFromConversation(messages: ChatMessage[]): Promise<GoalExtraction> {
  const joined = messages.map((message) => `${message.role}: ${message.content}`).join("\n");
  const heuristic = {
    goalType: inferGoalType(joined),
    targetAmount: extractCurrency(joined),
    horizonYears: extractYears(joined),
    monthlyContribution: extractMonthlyContribution(joined),
    lumpSum: extractLumpSum(joined),
    emotionalWeight: extractEmotionalWeight(joined),
    summary: "Structured from onboarding conversation."
  };

  const client = getOpenAIClient();
  if (!client) {
    return {
      ...heuristic,
      contradictions: detectContradictions(joined, heuristic.horizonYears, heuristic.targetAmount)
    };
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input: [
        { role: "system", content: SYSTEM_BOUNDARY_PROMPT },
        {
          role: "user",
          content:
            "Extract only structured goal fields from this conversation. Return strict JSON with goalType, targetAmount, horizonYears, monthlyContribution, lumpSum, emotionalWeight, summary.\n\n" +
            joined
        }
      ]
    });

    const parsed = extractionSchema.parse(JSON.parse(response.output_text || "{}"));
    return {
      ...parsed,
      contradictions: detectContradictions(joined, parsed.horizonYears, parsed.targetAmount)
    };
  } catch {
    return {
      ...heuristic,
      contradictions: detectContradictions(joined, heuristic.horizonYears, heuristic.targetAmount)
    };
  }
}
