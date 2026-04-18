"use client";

import { PortfolioInstrument } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

const riskLabels = [
  { max: 8, label: "Low" },
  { max: 14, label: "Moderate" },
  { max: Number.POSITIVE_INFINITY, label: "Elevated" }
];

function getRiskLabel(risk: number) {
  return riskLabels.find((item) => risk <= item.max)?.label ?? "Moderate";
}

export function SuggestionCard({ instrument }: { instrument: PortfolioInstrument }) {
  return (
    <article className="suggestion-card">
      <div className="suggestion-header">
        <div>
          <h4>{instrument.categoryLabel}</h4>
          <p>{instrument.summary}</p>
        </div>
        <span className="suggestion-badge">{instrument.allocationWeight}%</span>
      </div>
      <div className="suggestion-metrics">
        <div>
          <span>Expected return</span>
          <strong>{formatPercent(instrument.expectedReturn)}</strong>
        </div>
        <div>
          <span>Risk level</span>
          <strong>{getRiskLabel(instrument.risk)}</strong>
        </div>
      </div>
      <div className="fine">{instrument.reason}</div>
    </article>
  );
}
