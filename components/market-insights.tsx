"use client";

import { AllocationSlice, PortfolioInstrument, ProfileResult } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

type Insight = {
  title: string;
  body: string;
  tone: "positive" | "neutral" | "warning";
};

function weightOf(allocation: AllocationSlice[], asset: string) {
  return allocation.find((slice) => slice.asset === asset)?.weight ?? 0;
}

export function MarketInsights({
  instruments,
  allocation,
  profile,
  horizonYears
}: {
  instruments: PortfolioInstrument[];
  allocation: AllocationSlice[];
  profile: ProfileResult;
  horizonYears: number;
}) {
  const insights: Insight[] = [];

  const equityWeight = weightOf(allocation, "equity");
  const debtWeight = weightOf(allocation, "debt");
  const goldWeight = weightOf(allocation, "gold");
  const cashWeight = weightOf(allocation, "cash");

  if (equityWeight >= 60) {
    insights.push({
      title: "Stocks do the heavy lifting",
      body: `${equityWeight.toFixed(1)}% of your plan is in stock-based funds. Historically, Indian equity has delivered roughly 11-13% per year over long periods, but expect 25-35% dips along the way.`,
      tone: "positive"
    });
  } else if (equityWeight >= 35) {
    insights.push({
      title: "Balanced mix of growth and safety",
      body: `With ${equityWeight.toFixed(1)}% in equity and ${debtWeight.toFixed(1)}% in debt, your plan is middle-of-the-road. Smoother ride, slightly lower long-run returns than a pure equity plan.`,
      tone: "neutral"
    });
  } else {
    insights.push({
      title: "Playing it safe",
      body: `Only ${equityWeight.toFixed(1)}% is in stocks. That keeps the ride calm, but your money may barely outpace inflation over ${horizonYears} years.`,
      tone: "warning"
    });
  }

  if (goldWeight >= 5) {
    insights.push({
      title: "Gold as a shock absorber",
      body: `${goldWeight.toFixed(1)}% in gold helps when stocks and debt both struggle (like during high inflation or geopolitical stress). Gold alone returns roughly 8-9% over long periods in India.`,
      tone: "neutral"
    });
  }

  if (cashWeight >= 8) {
    insights.push({
      title: "Plenty of cash on hand",
      body: `${cashWeight.toFixed(1)}% sits in cash/liquid. Great for peace of mind, but cash barely beats inflation. Fine if your goal is close or you are still building an emergency cushion.`,
      tone: "neutral"
    });
  }

  const bestReturn = [...instruments].sort((a, b) => (b.expectedReturn ?? 0) - (a.expectedReturn ?? 0))[0];
  const safest = [...instruments].sort((a, b) => (a.risk ?? 0) - (b.risk ?? 0))[0];

  if (bestReturn) {
    insights.push({
      title: "Growth engine in your plan",
      body: `${bestReturn.name} has the highest expected return in your picks (${formatPercent(bestReturn.expectedReturn)}). Higher return usually comes with higher swings (${formatPercent(bestReturn.risk)} volatility).`,
      tone: "positive"
    });
  }

  if (safest && safest.schemeId !== bestReturn?.schemeId) {
    insights.push({
      title: "Shock absorber in your plan",
      body: `${safest.name} is the calmest holding (${formatPercent(safest.risk)} volatility). It gives up some return (${formatPercent(safest.expectedReturn)}) in exchange for stability.`,
      tone: "neutral"
    });
  }

  if (profile.behavioralFlags.thinEmergencyBuffer) {
    insights.push({
      title: "Build your emergency cushion first",
      body: "Your emergency fund is below 6 months of expenses. Before increasing risk, it is usually wiser to top up your safety buffer in a plain savings or liquid fund.",
      tone: "warning"
    });
  }

  if (profile.behavioralFlags.shortHorizonPressure) {
    insights.push({
      title: "Short horizon, high risk tolerance",
      body: "You have less than 4 years to the goal but are comfortable with risk. Markets can dip 30%+ in a year; make sure you can actually wait if that happens.",
      tone: "warning"
    });
  }

  if (horizonYears >= 10) {
    insights.push({
      title: "Time is your biggest advantage",
      body: `With ${horizonYears} years to go, compounding does the heavy lifting. A simple SIP, held patiently, tends to beat clever timing for most new investors.`,
      tone: "positive"
    });
  }

  const toneColor: Record<Insight["tone"], string> = {
    positive: "#10b981",
    neutral: "#ef4e20",
    warning: "#f5a524"
  };

  return (
    <div className="stack" style={{ padding: "0 26px 26px", gap: 12 }}>
      {insights.map((insight) => (
        <div
          key={insight.title}
          style={{
            padding: "14px 16px",
            borderRadius: 16,
            background: "var(--surface-soft)",
            border: "1px solid var(--line)",
            borderLeft: `4px solid ${toneColor[insight.tone]}`
          }}
        >
          <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4, fontWeight: 800 }}>{insight.title}</strong>
          <div className="fine" style={{ color: "var(--muted)", lineHeight: 1.5 }}>
            {insight.body}
          </div>
        </div>
      ))}
    </div>
  );
}
