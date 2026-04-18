"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { formatCurrency } from "@/lib/utils";

export type GrowthPoint = {
  year: number;
  invested: number;
  projected: number;
  target: number;
};

export function ComparisonGrowthChart({
  planA,
  planB
}: {
  planA: { name: string; growth: GrowthPoint[] };
  planB: { name: string; growth: GrowthPoint[] };
}) {
  const maxYears = Math.max(planA.growth.length, planB.growth.length);
  const merged = Array.from({ length: maxYears }, (_, index) => ({
    year: index,
    a: planA.growth[index]?.projected ?? null,
    b: planB.growth[index]?.projected ?? null
  }));

  return (
    <div style={{ width: "100%", height: 320, padding: "0 8px 8px" }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 16, right: 12, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="rgba(134,147,179,0.16)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 100000)}L`} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="a"
            name={planA.name}
            stroke="#ef4e20"
            strokeWidth={3}
            dot={false}
            connectNulls
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="b"
            name={planB.name}
            stroke="#0e1117"
            strokeWidth={3}
            dot={false}
            connectNulls
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PortfolioGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <div style={{ width: "100%", height: 320, padding: "0 8px 8px" }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 16, right: 12, bottom: 6, left: 0 }}>
          <CartesianGrid stroke="rgba(134,147,179,0.16)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="year" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 100000)}L`} tickLine={false} axisLine={false} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Legend />
          <Line
            type="monotone"
            dataKey="invested"
            name="Invested"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            animationDuration={900}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="Projected"
            stroke="#ef4e20"
            strokeWidth={3}
            dot={false}
            animationDuration={1200}
          />
          <Line
            type="monotone"
            dataKey="target"
            name="Target"
            stroke="#0e1117"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
