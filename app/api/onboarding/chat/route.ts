import { NextRequest } from "next/server";

import { extractGoalFromConversation } from "@/lib/ai/goal-extractor";
import { streamNdjson } from "@/lib/ai/stream";
import { ChatMessage } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { messages: ChatMessage[] };
  const extraction = await extractGoalFromConversation(body.messages ?? []);

  const reply = extraction.contradictions.length
    ? `I’ve captured your ${extraction.goalType.toLowerCase()} goal. I also found a few contradictions to resolve before planning: ${extraction.contradictions.join(
        " "
      )}`
    : `I’ve captured your ${extraction.goalType.toLowerCase()} goal. Target ${
        extraction.targetAmount ? `looks like ₹${extraction.targetAmount.toLocaleString("en-IN")}` : "is still missing"
      }, horizon is ${extraction.horizonYears ?? "unknown"} years, and emotional weight is ${extraction.emotionalWeight}.`;

  return new Response(
    streamNdjson([
      { type: "chunk", content: reply },
      { type: "summary", extraction }
    ]),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    }
  );
}
