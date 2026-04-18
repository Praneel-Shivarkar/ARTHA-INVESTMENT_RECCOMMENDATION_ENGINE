import { NextRequest } from "next/server";

import { answerCopilotChat } from "@/lib/ai/copilot";
import { CopilotPortfolioContext } from "@/lib/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    message: string;
    portfolio: CopilotPortfolioContext;
  };
  try {
    const reply = await answerCopilotChat(body);
    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Copilot request failed." },
      { status: 500 }
    );
  }
}
