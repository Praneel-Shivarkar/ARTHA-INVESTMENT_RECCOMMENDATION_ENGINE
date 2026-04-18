import { buildAllocation } from "@/lib/core/allocation";
import { generateHistoricalReturns, getReturnProfile } from "@/lib/data/returns";
import {
  AllocationResult,
  AssetClass,
  InvestmentType,
  PortfolioInstrument,
  ProfileInput,
  ProfileResult
} from "@/lib/types";
import { round2 } from "@/lib/utils";

type CategoryPoolItem = {
  label: string;
  asset: AssetClass;
  type: InvestmentType;
  summary: string;
};

const categoryPool: CategoryPoolItem[] = [
  {
    label: "Large Cap Equity",
    asset: "equity",
    type: "ETF",
    summary: "Anchors the plan with broad market leadership and steady compounding potential."
  },
  {
    label: "Flexi Cap",
    asset: "equity",
    type: "Mutual Fund",
    summary: "Adds flexibility to rotate across market segments as conditions evolve."
  },
  {
    label: "Mid Cap",
    asset: "equity",
    type: "Mutual Fund",
    summary: "Adds higher growth potential for investors with a longer compounding runway."
  },
  {
    label: "Small Cap",
    asset: "equity",
    type: "Mutual Fund",
    summary: "Introduces a higher-risk growth sleeve for aggressive long-horizon plans."
  },
  {
    label: "Debt Fund",
    asset: "debt",
    type: "Mutual Fund",
    summary: "Provides predictable income and helps dampen portfolio volatility."
  },
  {
    label: "Gold ETF",
    asset: "gold",
    type: "ETF",
    summary: "Diversifies against inflation and equity-market stress."
  },
  {
    label: "Liquid Fund",
    asset: "cash",
    type: "Mutual Fund",
    summary: "Maintains liquidity for short-term needs and contribution flexibility."
  }
];

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex]!, next[index]!];
  }
  return next;
}

function selectionCounts(profile: ProfileResult, profileInput: ProfileInput) {
  if (profile.riskScore > 70) {
    return profileInput.horizonYears < 5
      ? { equity: 2, debt: 2, gold: 1, cash: 0 }
      : { equity: 4, debt: 1, gold: 1, cash: 0 };
  }

  if (profile.riskScore >= 40) {
    return profileInput.horizonYears < 5
      ? { equity: 1, debt: 2, gold: 1, cash: 1 }
      : { equity: 2, debt: 2, gold: 1, cash: 0 };
  }

  return { equity: 1, debt: 2, gold: 1, cash: 1 };
}

function pickCategories(pool: CategoryPoolItem[], count: number) {
  return shuffle(pool).slice(0, Math.max(Math.min(count, pool.length), 0));
}

function categoryWeight(allocation: AllocationResult, asset: AssetClass) {
  return allocation.current.find((slice) => slice.asset === asset)?.weight ?? 0;
}

function buildInstrument(item: CategoryPoolItem, allocationWeight: number, profileInput: ProfileInput, index: number): PortfolioInstrument {
  const profile = getReturnProfile(item.label, item.asset);
  const returnSeries = generateHistoricalReturns(item.label, item.asset, 120);

  return {
    schemeId: `${item.label.toLowerCase().replace(/\s+/g, "-")}-${index}`,
    name: item.label,
    categoryLabel: item.label,
    asset: item.asset,
    type: item.type,
    provider: "fallback",
    weight: round2(allocationWeight),
    allocationWeight: round2(allocationWeight),
    monthlySipShare: round2((profileInput.monthlySavings * allocationWeight) / 100),
    reason: item.summary,
    summary: item.summary,
    score: round2(profile.annualReturn * 6 - profile.annualVolatility * 1.5),
    returnSeries,
    history: [],
    expectedReturn: round2(profile.annualReturn),
    risk: round2(profile.annualVolatility)
  };
}

export async function selectPortfolio(
  profile: ProfileResult,
  profileInput: ProfileInput
): Promise<{ allocation: AllocationResult; instruments: PortfolioInstrument[] }> {
  const allocation = buildAllocation(
    profile.riskBand,
    profile.riskScore,
    profileInput.horizonYears,
    profileInput.riskPreference,
    profileInput.emergencyMonths
  );
  const counts = selectionCounts(profile, profileInput);

  const selected = [
    ...pickCategories(categoryPool.filter((item) => item.asset === "equity"), counts.equity),
    ...pickCategories(categoryPool.filter((item) => item.asset === "debt"), counts.debt),
    ...pickCategories(categoryPool.filter((item) => item.asset === "gold"), counts.gold),
    ...pickCategories(categoryPool.filter((item) => item.asset === "cash"), counts.cash)
  ];

  const instruments = selected.map((item, index) => {
    const sameAssetCount = selected.filter((entry) => entry.asset === item.asset).length;
    const allocationWeight = categoryWeight(allocation, item.asset) / Math.max(sameAssetCount, 1);
    return buildInstrument(item, allocationWeight, profileInput, index);
  });

  return {
    allocation,
    instruments
  };
}
