import { getCookie, setCookie } from "@/lib/client-cookies";

export const PROFILE_LOCATION_COOKIE = "sip_profile_location";

type SavedLocation = { city?: string; state?: string };

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export function locationFromAddress(address: string | null | undefined): SavedLocation | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const stateIndex = parts.findIndex((part) =>
    INDIAN_STATES.some((state) => new RegExp(`\\b${state}\\b`, "i").test(part)),
  );
  if (stateIndex < 1) return null;
  const state = INDIAN_STATES.find((s) => new RegExp(`\\b${s}\\b`, "i").test(parts[stateIndex]));
  const city = parts[stateIndex - 1]?.replace(/\b\d{5,6}\b/g, "").trim();
  return city || state ? { city, state } : null;
}

export function saveProfileLocation(location: SavedLocation) {
  if (!location.city && !location.state) return;
  setCookie(PROFILE_LOCATION_COOKIE, JSON.stringify(location));
}

export function getSavedProfileLocation(): SavedLocation | null {
  const raw = getCookie(PROFILE_LOCATION_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedLocation;
    return parsed.city || parsed.state ? parsed : null;
  } catch {
    return null;
  }
}
