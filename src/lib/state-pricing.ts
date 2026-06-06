/**
 * State-based alcohol pricing for India.
 *
 * Base prices are Delhi MRP. Each state has a multiplier reflecting
 * its excise duty structure relative to Delhi.
 *
 * Prohibition states are excluded — they won't appear in the selector.
 */

export interface IndianState {
  code: string;
  name: string;
  /** Price multiplier relative to Delhi (1.0) */
  multiplier: number;
}

export const INDIAN_STATES: IndianState[] = [
  { code: "AP",  name: "Andhra Pradesh",   multiplier: 1.35 },
  { code: "AR",  name: "Arunachal Pradesh", multiplier: 0.85 },
  { code: "AS",  name: "Assam",            multiplier: 1.10 },
  { code: "CH",  name: "Chandigarh",       multiplier: 0.95 },
  { code: "CG",  name: "Chhattisgarh",     multiplier: 1.05 },
  { code: "DL",  name: "Delhi",            multiplier: 1.00 },
  { code: "GA",  name: "Goa",              multiplier: 0.65 },
  { code: "HR",  name: "Haryana",          multiplier: 0.90 },
  { code: "HP",  name: "Himachal Pradesh", multiplier: 0.80 },
  { code: "JH",  name: "Jharkhand",        multiplier: 1.10 },
  { code: "KA",  name: "Karnataka",        multiplier: 1.15 },
  { code: "KL",  name: "Kerala",           multiplier: 1.40 },
  { code: "MP",  name: "Madhya Pradesh",   multiplier: 1.10 },
  { code: "MH",  name: "Maharashtra",      multiplier: 1.20 },
  { code: "MN",  name: "Manipur",          multiplier: 1.15 },
  { code: "ML",  name: "Meghalaya",        multiplier: 0.90 },
  { code: "NL",  name: "Nagaland",         multiplier: 1.00 }, // partial ban, complex
  { code: "OR",  name: "Odisha",           multiplier: 1.05 },
  { code: "PB",  name: "Punjab",           multiplier: 0.85 },
  { code: "RJ",  name: "Rajasthan",        multiplier: 1.10 },
  { code: "SK",  name: "Sikkim",           multiplier: 0.75 },
  { code: "TN",  name: "Tamil Nadu",       multiplier: 1.30 },
  { code: "TS",  name: "Telangana",        multiplier: 1.25 },
  { code: "TR",  name: "Tripura",          multiplier: 1.05 },
  { code: "UK",  name: "Uttarakhand",      multiplier: 0.85 },
  { code: "UP",  name: "Uttar Pradesh",    multiplier: 1.05 },
  { code: "WB",  name: "West Bengal",      multiplier: 1.10 },
  { code: "PY",  name: "Puducherry",       multiplier: 0.60 },
  { code: "DN",  name: "Dadra & Nagar Haveli", multiplier: 0.70 },
  { code: "DD",  name: "Daman & Diu",      multiplier: 0.65 },
];

export const DEFAULT_STATE_CODE = "DL";

export function getStateByCode(code: string): IndianState | undefined {
  return INDIAN_STATES.find((s) => s.code === code);
}

export function calculateStatePrice(basePriceInr: number, stateCode: string): number {
  const state = getStateByCode(stateCode);
  const multiplier = state?.multiplier ?? 1.0;
  // Round to nearest 10 for realistic pricing
  return Math.round((basePriceInr * multiplier) / 10) * 10;
}

export function formatPriceINR(price: number): string {
  if (price >= 1000) {
    // Format with comma: 1,500 / 8,500
    return "₹" + price.toLocaleString("en-IN");
  }
  return "₹" + price;
}
