import { NextRequest, NextResponse } from "next/server";

import { computeRiskProfile } from "@/lib/core/profiling";
import { ProfileInput } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as ProfileInput;
  return NextResponse.json(computeRiskProfile(body));
}
