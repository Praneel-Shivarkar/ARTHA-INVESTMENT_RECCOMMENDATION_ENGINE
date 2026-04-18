import { NormalizedMarketPoint } from "@/lib/types";
import { round2 } from "@/lib/utils";

interface MfApiHistoryResponse {
  data?: Array<{
    date: string;
    nav: string;
  }>;
}

function normalizeAmfiDate(value: string) {
  const [day, month, year] = value.split("-");
  return `${year}-${month}-${day}`;
}

export async function searchSchemeCode(query: string) {
  const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) throw new Error(`AMFI search failed for ${query}`);
  const results = (await response.json()) as Array<{
    schemeCode: number;
    schemeName: string;
  }>;
  if (!results.length) throw new Error(`No AMFI scheme found for ${query}`);
  return String(results[0]!.schemeCode);
}

export async function getNAVHistory(schemeCode: string): Promise<NormalizedMarketPoint[]> {
  const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
    next: { revalidate: 3600 }
  });
  if (!response.ok) throw new Error(`AMFI NAV history failed for ${schemeCode}`);
  const payload = (await response.json()) as MfApiHistoryResponse;
  const chronological = [...(payload.data ?? [])].reverse();

  return chronological.map((entry, index, array) => {
    const price = Number(entry.nav);
    const previous = array[index - 1] ? Number(array[index - 1]!.nav) : null;
    return {
      date: normalizeAmfiDate(entry.date),
      price: round2(price),
      returns: previous ? round2(((price - previous) / previous) * 100) : 0
    };
  });
}
