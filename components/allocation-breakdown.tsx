"use client";

import { AllocationResult, AssetClass, PortfolioInstrument } from "@/lib/types";

const assetMeta: Record<
  AssetClass,
  {
    label: string;
    color: string;
    description: string;
  }
> = {
  equity: {
    label: "Equity",
    color: "#ef4e20",
    description: "Drives long-term growth"
  },
  debt: {
    label: "Debt",
    color: "#0e1117",
    description: "Provides stability"
  },
  gold: {
    label: "Gold",
    color: "#f5a524",
    description: "Adds diversification"
  },
  cash: {
    label: "Cash",
    color: "#cbd2da",
    description: "Keeps liquidity available"
  }
};

export function AllocationBreakdown({
  allocation,
  instruments
}: {
  allocation: AllocationResult;
  instruments: PortfolioInstrument[];
}) {
  const current = allocation.current.filter((slice) => slice.weight > 0);

  return (
    <div className="allocation-shell">
      <div className="allocation-bar" aria-label="Portfolio allocation">
        {current.map((slice) => (
          <div
            key={slice.asset}
            className="allocation-segment"
            style={{
              width: `${slice.weight}%`,
              background: assetMeta[slice.asset].color
            }}
            title={`${assetMeta[slice.asset].label} ${slice.weight}%`}
          />
        ))}
      </div>

      <div className="allocation-grid">
        {current.map((slice) => {
          const linkedSuggestions = instruments.filter((instrument) => instrument.asset === slice.asset).length;
          return (
            <div className="allocation-card" key={slice.asset}>
              <div className="allocation-card-top">
                <div
                  className="allocation-dot"
                  style={{
                    background: assetMeta[slice.asset].color
                  }}
                />
                <strong>{assetMeta[slice.asset].label}</strong>
                <span>{slice.weight}%</span>
              </div>
              <p>{assetMeta[slice.asset].description}</p>
              <div className="fine">{linkedSuggestions} suggestion{linkedSuggestions === 1 ? "" : "s"} aligned to this sleeve.</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
