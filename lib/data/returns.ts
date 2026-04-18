import { AssetClass } from "@/lib/types";

export type ReturnProfile = {
  annualReturn: number;
  annualVolatility: number;
};

const returnProfiles: Record<string, ReturnProfile> = {
  "Large Cap Equity": { annualReturn: 11, annualVolatility: 15 },
  "Indian Large Cap Equity": { annualReturn: 11, annualVolatility: 15 },
  "Flexi Cap": { annualReturn: 12, annualVolatility: 17 },
  "Flexi Cap Growth": { annualReturn: 12, annualVolatility: 17 },
  "Mid Cap": { annualReturn: 13, annualVolatility: 20 },
  "Mid Cap Growth": { annualReturn: 13, annualVolatility: 20 },
  "Small Cap": { annualReturn: 14, annualVolatility: 24 },
  "Focused Equity": { annualReturn: 12.5, annualVolatility: 18 },
  "Core Equity": { annualReturn: 11, annualVolatility: 15 },
  "Balanced Equity": { annualReturn: 10, annualVolatility: 13 },
  "Debt Fund": { annualReturn: 6, annualVolatility: 4 },
  "Short-Term Debt": { annualReturn: 6, annualVolatility: 4 },
  "Income Stability Debt": { annualReturn: 6.2, annualVolatility: 4.5 },
  "Corporate Bond Debt": { annualReturn: 6.5, annualVolatility: 5 },
  "Gold ETF": { annualReturn: 8, annualVolatility: 10 },
  "Liquid Fund": { annualReturn: 4, annualVolatility: 1 },
  "Liquid / Cash": { annualReturn: 4, annualVolatility: 1 }
};

const assetDefaults: Record<AssetClass, ReturnProfile> = {
  equity: { annualReturn: 11, annualVolatility: 15 },
  debt: { annualReturn: 6, annualVolatility: 4 },
  gold: { annualReturn: 8, annualVolatility: 10 },
  cash: { annualReturn: 4, annualVolatility: 1 }
};

function seededUniform(seed: number) {
  const next = Math.sin(seed) * 10000;
  return next - Math.floor(next);
}

function hashString(value: string) {
  return value.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
}

function seededGaussian(seed: number) {
  const u1 = Math.max(seededUniform(seed), 1e-9);
  const u2 = Math.max(seededUniform(seed + 1), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function getReturnProfile(categoryLabel: string, asset: AssetClass): ReturnProfile {
  return returnProfiles[categoryLabel] ?? assetDefaults[asset];
}

export function annualToMonthlyReturn(annualReturn: number) {
  return (Math.pow(1 + annualReturn / 100, 1 / 12) - 1) * 100;
}

export function annualToMonthlyVolatility(annualVolatility: number) {
  return annualVolatility / Math.sqrt(12);
}

export function generateHistoricalReturns(categoryLabel: string, asset: AssetClass, months = 120) {
  const profile = getReturnProfile(categoryLabel, asset);
  const monthlyMean = annualToMonthlyReturn(profile.annualReturn);
  const monthlyVolatility = annualToMonthlyVolatility(profile.annualVolatility);
  const seedBase = hashString(`${categoryLabel}-${asset}`);

  return Array.from({ length: months }, (_, index) => {
    const gaussian = seededGaussian(seedBase + index * 13);
    return Number((monthlyMean + monthlyVolatility * gaussian).toFixed(4));
  });
}
