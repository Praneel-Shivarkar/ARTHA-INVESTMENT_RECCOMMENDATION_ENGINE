import { NextRequest } from "next/server";

import { explainPortfolio } from "@/lib/ai/explanation";
import { streamTextAsEvents } from "@/lib/ai/stream";
import { ExplainPayload } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ExplainPayload;
  const explanation = await explainPortfolio(payload);

  return new Response(streamTextAsEvents(explanation), {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
