import { FundScheme, RankedScheme } from "@/lib/types";
import { average, normalizeScore } from "@/lib/utils";

function computeReturnConsistency(monthlyReturns: number[]) {
  const mean = average(monthlyReturns);
  const variance =
    monthlyReturns.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
    Math.max(monthlyReturns.length, 1);
  const stdev = Math.sqrt(variance);
  return Math.max(0, 100 - stdev * 20);
}

function computeDownsideCapture(scheme: FundScheme) {
  const portfolioDownMonths = scheme.monthlyReturns.filter((_, index) => (scheme.benchmarkMonthlyReturns[index] ?? 0) < 0);
  const benchmarkDownMonths = scheme.benchmarkMonthlyReturns.filter((value) => value < 0);

  if (!benchmarkDownMonths.length) return Math.max(0, 100 - scheme.downsideCaptureRatio);
  const portfolioAverage = Math.abs(average(portfolioDownMonths));
  const benchmarkAverage = Math.abs(average(benchmarkDownMonths));
  if (!benchmarkAverage) return 50;
  const ratio = (portfolioAverage / benchmarkAverage) * 100;
  return Math.max(0, 100 - ratio);
}

function computeTrackingError(scheme: FundScheme) {
  const diffs = scheme.monthlyReturns.map(
    (value, index) => value - (scheme.benchmarkMonthlyReturns[index] ?? 0)
  );
  const mean = average(diffs);
  const variance = diffs.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(diffs.length, 1);
  return Math.sqrt(variance);
}

function computeExpectedAnnualReturn(monthlyReturns: number[]) {
  const monthlyAverage = average(monthlyReturns) / 100;
  return ((1 + monthlyAverage) ** 12 - 1) * 100;
}

function computeAnnualizedVolatility(monthlyReturns: number[]) {
  const mean = average(monthlyReturns);
  const variance =
    monthlyReturns.reduce((acc, value) => acc + (value - mean) ** 2, 0) / Math.max(monthlyReturns.length, 1);
  return Math.sqrt(variance) * Math.sqrt(12);
}

export function rankSchemes(schemes: FundScheme[]): RankedScheme[] {
  const expenses = schemes.map((scheme) => scheme.expenseRatio);
  const aums = schemes.map((scheme) => scheme.aumCr);
  const computedTrackingErrors = schemes.map((scheme) => computeTrackingError(scheme));
  const tenures = schemes.map((scheme) => scheme.managerTenureYears);

  return schemes
    .map((scheme) => {
      const returnConsistency = computeReturnConsistency(scheme.monthlyReturns);
      const downsideCapture = computeDownsideCapture(scheme);
      const trackingError = computeTrackingError(scheme);
      const expectedReturn = computeExpectedAnnualReturn(scheme.monthlyReturns);
      const risk = computeAnnualizedVolatility(scheme.monthlyReturns);
      const expenseRatioScore = normalizeScore(
        scheme.expenseRatio,
        Math.min(...expenses),
        Math.max(...expenses),
        true
      );
      const aumScore = normalizeScore(scheme.aumCr, Math.min(...aums), Math.max(...aums));
      const trackingErrorScore = normalizeScore(
        trackingError,
        Math.min(...computedTrackingErrors),
        Math.max(...computedTrackingErrors),
        true
      );
      const managerTenure = normalizeScore(
        scheme.managerTenureYears,
        Math.min(...tenures),
        Math.max(...tenures)
      );

      const compositeScore =
        0.25 * returnConsistency +
        0.2 * downsideCapture +
        0.15 * expenseRatioScore +
        0.15 * aumScore +
        0.15 * trackingErrorScore +
        0.1 * managerTenure;

      return {
        ...scheme,
        returnConsistency,
        downsideCapture,
        expenseRatioScore,
        aumScore,
        expectedReturn,
        risk,
        trackingError,
        trackingErrorScore,
        managerTenure,
        compositeScore
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}
