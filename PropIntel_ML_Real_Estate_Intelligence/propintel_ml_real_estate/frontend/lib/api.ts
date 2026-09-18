const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export type Summary = {
  properties_analyzed: number;
  median_property_value: number;
  average_monthly_rent: number;
  high_demand_listings: number;
  pricing_anomalies: number;
  model_mape_pct: number;
  top_markets: Array<{
    city: string;
    area: string;
    avg_price: number;
    median_price: number;
    avg_rent: number;
    demand: number;
    listings: number;
    avg_days: number;
    growth_pct: number;
  }>;
};

export type Trend = {
  history: Array<{ month: string; median_price: number }>;
  forecast: Array<{ month: string; median_price: number }>;
  annualized_growth_signal: number;
  trend_slope: number;
  city: string;
  area: string;
};

export async function getSummary() { return request<Summary>("/api/summary"); }
export async function getMeta() { return request<{ cities: string[]; areas: string[]; property_types: string[] }>("/api/meta"); }
export async function getMarket(city = "All") { return request<Summary["top_markets"]>(`/api/market?city=${encodeURIComponent(city)}`); }
export async function getListings(city = "All", propertyType = "All") {
  return request<Array<{
    id: string; city: string; area: string; property_type: string; size_sqft: number;
    bedrooms: number; bathrooms: number; price: number; monthly_rent: number;
    demand_score: number; listing_days: number;
  }>>(`/api/listings?city=${encodeURIComponent(city)}&property_type=${encodeURIComponent(propertyType)}&limit=12`);
}
export async function getTrend(city: string, area: string) { return request<Trend>(`/api/trend?city=${encodeURIComponent(city)}&area=${encodeURIComponent(area)}`); }
export async function getInsights() { return request<{ feature_importance: Array<{ feature: string; importance: number }> }>("/api/insights"); }

export type ValuationPayload = {
  city: string; area: string; property_type: string; size_sqft: number;
  bedrooms: number; bathrooms: number; age_years: number; asking_price: number;
  floor: number; parking: number; distance_school_km: number; distance_hospital_km: number;
  distance_market_km: number; distance_transit_km: number; amenities_score: number;
};

export async function runValuation(payload: ValuationPayload) {
  return request<{
    estimated_market_value: number; monthly_rent: number; rental_yield_pct: number;
    asking_price: number; price_gap_pct: number; demand: string; demand_probabilities: Record<string, number>;
    anomaly_score: number; risk: string; confidence: number; fair_value_low: number; fair_value_high: number;
    drivers: Array<{ name: string; value: number; unit: string; impact: number }>;
    comparables: Array<{ id: string; property_type: string; size_sqft: number; bedrooms: number; bathrooms: number; price: number; monthly_rent: number; demand_score: number; listing_days: number }>;
  }>("/api/valuation", { method: "POST", body: JSON.stringify(payload) });
}
