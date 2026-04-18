"use client";

import { useMemo, useState } from "react";

import { GoalExtraction, MonteCarloResult, PortfolioResult, TargetPlanResult } from "@/lib/types";
import { formatCurrency, formatPercent } from "@/lib/utils";

type StepId = "goal" | "risk" | "allocation" | "funds" | "simulation";

type StepContent = {
  title: string;
  body: string;
  lines: string[];
};

function buildSteps(
  goal: GoalExtraction,
  portfolio: PortfolioResult,
  simulation: MonteCarloResult,
  targetPlan: TargetPlanResult
): Record<StepId, StepContent> {
  return {
    goal: {
      title: "Goal",
      body: `${goal.goalType} in ${goal.horizonYears ?? "?"} years`,
      lines: [
        `Target ${formatCurrency(goal.targetAmount ?? 0)}`,
        `Monthly plan ${formatCurrency(targetPlan.requiredMonthlyInvestment)}`,
        `Emotion ${goal.emotionalWeight}`
      ]
    },
    risk: {
      title: "Risk",
      body: `${portfolio.profile.riskBand} (${portfolio.profile.riskScore}/100)`,
      lines: Object.entries(portfolio.profile.behavioralFlags).map(
        ([key, value]) => `${key}: ${value ? "flagged" : "clear"}`
      )
    },
    allocation: {
      title: "Allocation",
      body: portfolio.allocation.current.map((item) => `${item.asset} ${item.weight}%`).join(" | "),
      lines: portfolio.allocation.glidePath.slice(0, 5).map((year) => {
        const equity = year.weights.find((item) => item.asset === "equity")?.weight ?? 0;
        return `Year ${year.year}: equity ${equity}%`;
      })
    },
    funds: {
      title: "Funds",
      body: `${portfolio.instruments.length} personalized suggestions`,
      lines: portfolio.instruments.map(
        (item) =>
          `${item.name} | ${item.type} | return ${formatPercent(item.expectedReturn)} | risk ${formatPercent(item.risk)} | weight ${item.allocationWeight}%`
      )
    },
    simulation: {
      title: "Simulation",
      body: `${formatPercent(simulation.probabilityOfSuccess)} success probability`,
      lines: [
        `Required SIP ${formatCurrency(targetPlan.requiredMonthlyInvestment)}`,
        `P50 ${formatCurrency(simulation.percentiles.p50)}`,
        `Worst drawdown ${formatPercent(simulation.worstDrawdown)}`
      ]
    }
  };
}

const flowSteps: StepId[] = ["goal", "risk", "allocation", "funds", "simulation"];

export function InvestmentCanvas({
  goal,
  portfolio,
  simulation,
  targetPlan
}: {
  goal: GoalExtraction;
  portfolio: PortfolioResult;
  simulation: MonteCarloResult;
  targetPlan: TargetPlanResult;
}) {
  const steps = useMemo(
    () => buildSteps(goal, portfolio, simulation, targetPlan),
    [goal, portfolio, simulation, targetPlan]
  );
  const [selectedStep, setSelectedStep] = useState<StepId>("allocation");
  const selected = steps[selectedStep];

  return (
    <div className="canvas-shell">
      <div className="canvas-wrap" style={{ padding: 20 }}>
        <div className="flow-row">
          {flowSteps.map((step, index) => (
            <div className="flow-step" key={step}>
              <button
                className={`flow-button ${selectedStep === step ? "active" : ""}`}
                onClick={() => setSelectedStep(step)}
              >
                {steps[step].title}
              </button>
              {index < flowSteps.length - 1 ? <span className="flow-arrow">-&gt;</span> : null}
            </div>
          ))}
        </div>
        <div className="callout" style={{ marginTop: 24 }}>
          <strong>{selected.title}</strong>
          <div>{selected.body}</div>
        </div>
      </div>
      <aside className="side-panel">
        <h4>{selected.title}</h4>
        <p>{selected.body}</p>
        <div className="stack">
          {selected.lines.map((line) => (
            <div className="inline-stat" key={line}>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
