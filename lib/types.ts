export type RiskBand = "Conservative" | "Balanced" | "Growth" | "Aggressive";
export type GoalType =
  | "Retirement"
  | "Wealth Creation"
  | "Child Education"
  | "Emergency Corpus"
  | "Home Purchase"
  | "Vacation"
  | "Unknown";

export type AssetClass = "equity" | "debt" | "gold" | "cash";
export type EmotionalWeight = "low" | "medium" | "high";
export type MarketProvider = "yahoo" | "amfi" | "fallback";
export type InvestmentType = "Stock" | "ETF" | "Mutual Fund";
export type DiversificationInterpretation =
  | "Highly Diversified"
  | "Moderately Diversified"
  | "Concentrated";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UserAccountProfile {
  id: string;
  email: string;
  fullName: string;
  userHandle: string;
  phoneNumber: string;
}

export interface NormalizedMarketPoint {
  date: string;
  price: number;
  returns: number;
}

export interface GoalExtraction {
  goalType: GoalType;
  targetAmount: number | null;
  horizonYears: number | null;
  monthlyContribution: number | null;
  lumpSum: number | null;
  emotionalWeight: EmotionalWeight;
  contradictions: string[];
  summary: string;
}

export interface ProfileInput {
  age: number;
  annualIncome: number;
  monthlySavings: number;
  goalAmount: number;
  horizonYears: number;
  riskPreference: 1 | 2 | 3 | 4 | 5;
  emergencyMonths: number;
  dependents: number;
  investmentExperience: 1 | 2 | 3 | 4 | 5;
  drawdownTolerance: 1 | 2 | 3 | 4 | 5;
  incomeStability: 1 | 2 | 3 | 4 | 5;
  goalFlexibility: 1 | 2 | 3 | 4 | 5;
  reactionToLoss: "panic" | "concerned" | "steady";
}

export interface BehavioralFlags {
  panicSeller: boolean;
  overconfident: boolean;
  thinEmergencyBuffer: boolean;
  shortHorizonPressure: boolean;
}

export interface ProfileResult {
  riskScore: number;
  riskBand: RiskBand;
  behavioralFlags: BehavioralFlags;
  rationale: string[];
}

export interface AllocationSlice {
  asset: AssetClass;
  weight: number;
}

export interface AllocationResult {
  riskBand: RiskBand;
  current: AllocationSlice[];
  glidePath: Array<{
    year: number;
    weights: AllocationSlice[];
  }>;
}

export interface FundScheme {
  id: string;
  amfiCode: string;
  name: string;
  category: AssetClass;
  fundHouse: string;
  provider: MarketProvider;
  marketSymbol?: string;
  marketSearchTerm?: string;
  benchmarkSymbol?: string;
  expenseRatio: number;
  aumCr: number;
  trackingError: number;
  managerTenureYears: number;
  downsideCaptureRatio: number;
  monthlyReturns: number[];
  benchmarkMonthlyReturns: number[];
  navSeries: number[];
  history?: NormalizedMarketPoint[];
  benchmarkHistory?: NormalizedMarketPoint[];
  latestPrice?: number;
}

export interface UniverseAsset {
  id: string;
  provider: MarketProvider;
  category: AssetClass;
  marketSymbol?: string;
  marketSearchTerm?: string;
  benchmarkSymbol?: string;
  nameHint: string;
  fundHouse: string;
  expenseRatio: number;
  aumCr: number;
  trackingError: number;
  managerTenureYears: number;
  downsideCaptureRatio: number;
}

export interface RankedScheme extends FundScheme {
  returnConsistency: number;
  downsideCapture: number;
  expenseRatioScore: number;
  aumScore: number;
  expectedReturn: number;
  risk: number;
  trackingErrorScore: number;
  managerTenure: number;
  compositeScore: number;
}

export interface PortfolioInstrument {
  schemeId: string;
  name: string;
  categoryLabel: string;
  asset: AssetClass;
  type: InvestmentType;
  provider: MarketProvider;
  weight: number;
  allocationWeight: number;
  monthlySipShare: number;
  reason: string;
  summary: string;
  score: number;
  currentPrice?: number;
  returnSeries: number[];
  history: NormalizedMarketPoint[];
  expectedReturn: number;
  risk: number;
}

export interface DiversificationResult {
  score: number;
  interpretation: DiversificationInterpretation;
}

export interface PortfolioResult {
  profile: ProfileResult;
  assets: AllocationSlice[];
  allocation: AllocationResult;
  instruments: PortfolioInstrument[];
  diversification: DiversificationResult;
  portfolioExpectedReturn: number;
  portfolioRisk: number;
  expectedReturnRange: {
    low: number;
    base: number;
    high: number;
  };
}

export interface TargetPlanResult {
  targetAmount: number;
  years: number;
  currentMonthlyInvestment: number;
  requiredMonthlyInvestment: number;
  successProbability: number;
  gapToRequiredSip: number;
  message: string;
}

export interface MonteCarloInput {
  targetAmount: number;
  years: number;
  monthlyContribution: number;
  lumpSum: number;
  portfolioWeights: AllocationSlice[];
  instruments: Array<{
    name: string;
    weight: number;
    monthlyReturns: number[];
    expectedAnnualReturn?: number;
    annualVolatility?: number;
  }>;
  simulations?: number;
  blockSize?: number;
}

export interface MonteCarloResult {
  simulations: number;
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  probabilityOfSuccess: number;
  worstDrawdown: number;
  medianTerminalValue: number;
  sampledTerminalValues: number[];
}

export interface SimulationResponse {
  simulation: MonteCarloResult;
  targetPlan: TargetPlanResult;
}

export interface CopilotPortfolioContext {
  assets: AllocationSlice[];
  allocation: AllocationResult;
  riskScore: number;
  diversification: DiversificationResult;
  simulation?: MonteCarloResult;
  instruments: PortfolioInstrument[];
  portfolioExpectedReturn: number;
  portfolioRisk: number;
}

export interface ExplainPayload {
  goal: GoalExtraction;
  profile: ProfileResult;
  allocation: AllocationResult;
  instruments: PortfolioInstrument[];
  simulation?: MonteCarloResult;
  targetPlan?: TargetPlanResult;
}

export interface SavedPlan {
  id: string;
  userId: string;
  planName: string;
  scenarioName: string;
  inflationRate: number;
  profileInput: ProfileInput;
  goal: GoalExtraction;
  portfolio: PortfolioResult;
  simulation: MonteCarloResult;
  targetPlan: TargetPlanResult;
  createdAt: string;
}
