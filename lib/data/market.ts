import { getNAVHistory, searchSchemeCode } from "@/lib/data/amfi";
import { investmentUniverse } from "@/lib/core/universe";
import { getHistoricalData } from "@/lib/data/yahoo";
import { AssetClass, FundScheme, NormalizedMarketPoint, UniverseAsset } from "@/lib/types";

function buildFallbackHistory(series: number[]): NormalizedMarketPoint[] {
  const start = new Date();
  start.setMonth(start.getMonth() - (series.length - 1));

  return series.map((price, index, array) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const previous = array[index - 1];
    return {
      date: date.toISOString().slice(0, 10),
      price,
      returns: previous ? Number((((price - previous) / previous) * 100).toFixed(2)) : 0
    };
  });
}

function defaultBenchmarkSymbol(asset: AssetClass) {
  if (asset === "equity") return "^NSEI";
  if (asset === "gold") return "GOLDBEES.NS";
  return "LIQUIDBEES.NS";
}

async function resolveHistory(scheme: FundScheme) {
  try {
    if (scheme.provider === "yahoo" && scheme.marketSymbol) {
      return await getHistoricalData(scheme.marketSymbol);
    }
    if (scheme.provider === "amfi") {
      const schemeCode = scheme.amfiCode || (scheme.marketSearchTerm ? await searchSchemeCode(scheme.marketSearchTerm) : "");
      if (schemeCode) return await getNAVHistory(schemeCode);
    }
  } catch {
    return buildFallbackHistory(scheme.navSeries);
  }
  return buildFallbackHistory(scheme.navSeries);
}

function toFundScheme(asset: UniverseAsset): FundScheme {
  return {
    id: asset.id,
    amfiCode: "",
    name: asset.nameHint,
    category: asset.category,
    fundHouse: asset.fundHouse,
    provider: asset.provider,
    marketSymbol: asset.marketSymbol,
    marketSearchTerm: asset.marketSearchTerm,
    benchmarkSymbol: asset.benchmarkSymbol,
    expenseRatio: asset.expenseRatio,
    aumCr: asset.aumCr,
    trackingError: asset.trackingError,
    managerTenureYears: asset.managerTenureYears,
    downsideCaptureRatio: asset.downsideCaptureRatio,
    monthlyReturns: [],
    benchmarkMonthlyReturns: [],
    navSeries: [100, 101, 102, 103, 104, 105]
  };
}

async function resolveBenchmarkHistory(scheme: FundScheme) {
  try {
    const symbol = scheme.benchmarkSymbol || defaultBenchmarkSymbol(scheme.category);
    return await getHistoricalData(symbol);
  } catch {
    return buildFallbackHistory(
      scheme.navSeries.map((price, index) => price * (1 + (scheme.benchmarkMonthlyReturns[index - 1] ?? 0) / 100))
    );
  }
}

export async function getInvestmentUniverse(): Promise<FundScheme[]> {
  return Promise.all(
    investmentUniverse.map(async (asset) => {
      const scheme = toFundScheme(asset);
      const history = await resolveHistory(scheme);
      const benchmarkHistory = await resolveBenchmarkHistory(scheme);
      return {
        ...scheme,
        name: asset.marketSymbol || asset.marketSearchTerm || asset.nameHint,
        history,
        benchmarkHistory,
        monthlyReturns: history.map((point) => point.returns).slice(1),
        benchmarkMonthlyReturns: benchmarkHistory.map((point) => point.returns).slice(1),
        latestPrice: history.at(-1)?.price
      };
    })
  );
}
