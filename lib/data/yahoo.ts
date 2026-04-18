import yahooFinance from "yahoo-finance2";

import { NormalizedMarketPoint } from "@/lib/types";
import { round2 } from "@/lib/utils";

function normalizeYahooDate(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export function computeReturns(prices: Array<{ date: string; price: number }>): NormalizedMarketPoint[] {
  return prices
    .filter((point) => Number.isFinite(point.price) && point.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point, index, array) => {
      const previous = array[index - 1]?.price;
      const returns = previous ? round2(((point.price - previous) / previous) * 100) : 0;
      return {
        date: point.date,
        price: round2(point.price),
        returns
      };
    });
}

export function computeVolatility(prices: Array<{ date: string; price: number }>) {
  const normalized = computeReturns(prices).slice(1).map((point) => point.returns);
  if (!normalized.length) return 0;
  const mean = normalized.reduce((acc, value) => acc + value, 0) / normalized.length;
  const variance =
    normalized.reduce((acc, value) => acc + (value - mean) ** 2, 0) / normalized.length;
  return round2(Math.sqrt(variance) * Math.sqrt(12));
}

export async function getHistoricalData(symbol: string): Promise<NormalizedMarketPoint[]> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 3);

  const history = (await yahooFinance.historical(symbol, {
    period1,
    interval: "1mo"
  })) as Array<{
    date?: Date | string | null;
    adjClose?: number | null;
    close?: number | null;
  }>;

  return computeReturns(
    history.map((entry) => ({
      date: normalizeYahooDate(entry.date),
      price: Number(entry.adjClose ?? entry.close ?? 0)
    }))
  );
}
