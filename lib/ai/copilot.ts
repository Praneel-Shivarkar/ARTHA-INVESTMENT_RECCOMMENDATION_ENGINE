import { getOpenAIClient } from "@/lib/ai/client";
import { CopilotPortfolioContext } from "@/lib/types";

export async function answerCopilotChat(input: {
  message: string;
  portfolio: CopilotPortfolioContext;
}) {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error("OpenAI client is not configured.");
  }

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
      input: [
        {
          role: "system",
          content:
            "You are a financial assistant. Explain the portfolio, risks, and suggestions in simple language. DO NOT generate financial calculations."
        },
        {
          role: "user",
          content:
            "Use this deterministic portfolio context. Do not invent numbers or calculations. Answer the user's question clearly and concisely.\n\nPortfolio JSON:\n" +
            JSON.stringify(input.portfolio) +
            "\n\nUser question:\n" +
            input.message
        }
      ]
    });
    if (!response.output_text) {
      throw new Error("OpenAI returned an empty response.");
    }
    return response.output_text;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "OpenAI chat request failed.");
  }
}
