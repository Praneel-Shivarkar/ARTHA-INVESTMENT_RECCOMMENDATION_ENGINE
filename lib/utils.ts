export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export function average(values: number[]) {
  return values.length ? sum(values) / values.length : 0;
}

export function percentile(sortedValues: number[], q: number) {
  if (!sortedValues.length) return 0;
  const index = (sortedValues.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower]!;
  const weight = index - lower;
  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercent(value: number) {
  return `${round2(value)}%`;
}

export function normalizeScore(value: number, min: number, max: number, invert = false) {
  if (max === min) return 50;
  const raw = ((value - min) / (max - min)) * 100;
  return clamp(invert ? 100 - raw : raw, 0, 100);
}

export function chunkText(text: string, chunkSize = 48) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize));
  }
  return chunks;
}
