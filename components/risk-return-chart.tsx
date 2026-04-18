"use client";

import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from "recharts";

import { PortfolioInstrument } from "@/lib/types";

const colorByAsset: Record<string, string> = {
  equity: "#ef4e20",
  debt: "#0e1117",
  gold: "#f5a524",
  cash: "#94a3b8"
};

export function RiskReturnChart({ instruments }: { instruments: PortfolioInstrument[] }) {
  const groups: Record<string, Array<{ risk: number; ret: number; size: number; name: string }>> = {};
  instruments.forEach((instrument) => {
    const key = instrument.asset;
    const point = {
      risk: Number((instrument.risk ?? 0).toFixed(2)),
      ret: Number((instrument.expectedReturn ?? 0).toFixed(2)),
      size: Math.max(80, Math.round((instrument.allocationWeight ?? instrument.weight ?? 0) * 10)),
      name: instrument.name
    };
    if (!groups[key]) groups[key] = [];
    groups[key].push(point);
  });

  return (
    <div style={{ width: "100%", height: 300, padding: "0 8px 8px" }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 16, bottom: 10, left: 0 }}>
          <CartesianGrid stroke="rgba(14,17,23,0.08)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="risk"
            name="Risk"
            unit="%"
            tickLine={false}
            axisLine={false}
            label={{ value: "Risk (volatility %)", position: "insideBottom", offset: -2, fill: "#6b7280", fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="ret"
            name="Return"
            unit="%"
            tickLine={false}
            axisLine={false}
            label={{ value: "Expected return %", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 12 }}
          />
          <ZAxis type="number" dataKey="size" range={[80, 400]} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value) => `${Number(value).toFixed(2)}%`} />
          <Legend />
          {Object.entries(groups).map(([asset, points]) => (
            <Scatter key={asset} name={asset.toUpperCase()} data={points} fill={colorByAsset[asset] ?? "#6b7280"} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
