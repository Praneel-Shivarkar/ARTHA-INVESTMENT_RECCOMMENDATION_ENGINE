import { NextRequest, NextResponse } from "next/server";

import { buildMonteCarloInput } from "@/lib/core/engine";
import { runMonteCarloSimulation } from "@/lib/core/monte_carlo";
import { computeTargetPlan } from "@/lib/core/target_planning";
import { inngest } from "@/inngest/client";
import { PortfolioResult } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    portfolio: PortfolioResult;
    targetAmount: number;
    years: number;
    monthlyContribution: number;
    lumpSum: number;
    portfolioId?: string;
  };

  const simulationInput = buildMonteCarloInput({
    portfolio: body.portfolio,
    targetAmount: body.targetAmount,
    years: body.years,
    monthlyContribution: body.monthlyContribution,
    lumpSum: body.lumpSum
  });

  const result = runMonteCarloSimulation(simulationInput);
  const targetPlan = computeTargetPlan(simulationInput, result.probabilityOfSuccess);

  if (process.env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "simulation/requested",
      data: {
        portfolioId: body.portfolioId,
        targetAmount: body.targetAmount,
        probabilityOfSuccess: result.probabilityOfSuccess,
        requiredMonthlyInvestment: targetPlan.requiredMonthlyInvestment
      }
    });
  }

  return NextResponse.json({
    simulation: result,
    targetPlan
  });
}
