import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  googleTypesForCategory,
  parseNearbyCategory,
  toOperationalNearbyBars,
  type GooglePlace,
  type NearbyCategory,
} from "@/lib/nearby-places";

// GET /api/bars/nearby?lat=..&lng=..&radius=3000
// Real nearby bars via Google Places API (New) "searchNearby". The API key is
// read server-side only (GOOGLE_MAPS_API_KEY) so it is never exposed to the
// client. Returns the same Bar-ish shape the bars list/card already renders,
// with `external: true` so the UI knows these aren't our own catalog rows.
//
// DENIAL-OF-WALLET: this proxies a BILLED upstream call, so it is gated behind
// auth + per-account AND per-IP rate limits, and results are cached on rounded
// coordinates so panning the map can't run up the Google bill. Add a Vercel WAF
// rule on this path too before enabling the key in prod.

export const dynamic = "force-dynamic";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
].join(",");

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function fetchNearby(
  lat: number,
  lng: number,
  radius: number,
  category: NearbyCategory | null,
  key: string,
) {
  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: googleTypesForCategory(category),
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });
  if (!res.ok) throw new Error(`places ${res.status}`);
  const json = (await res.json()) as { places?: GooglePlace[] };
  return toOperationalNearbyBars(json.places ?? [], category);
}

export async function GET(request: Request) {
  // Auth + throttle BEFORE touching the billed upstream.
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended", data: [] }, { status: 403 });
  if (
    !(await rateLimit(`bars-nearby:${me.id}`, 20, 60_000)) ||
    !(await rateLimit(`bars-nearby-ip:${clientIp(request)}`, 40, 60_000))
  ) {
    return NextResponse.json(
      { error: "Too many nearby searches. Please slow down.", data: [] },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Nearby search is not configured yet (missing GOOGLE_MAPS_API_KEY).", data: [] },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));
  const radius = Math.min(Math.max(num(searchParams.get("radius")) ?? 3000, 200), 50000);
  const rawCategory = searchParams.get("type");
  const category = parseNearbyCategory(rawCategory);
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Valid lat & lng required", data: [] }, { status: 400 });
  }
  if (rawCategory && !category) {
    return NextResponse.json({ error: "Unsupported nearby bar type", data: [] }, { status: 400 });
  }

  // Round to ~110m so nearby pans hit the same cache entry.
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;

  try {
    const data = await fetchNearby(rLat, rLng, radius, category, key);
    return NextResponse.json({ data, meta: { category, radius, count: data.length } });
  } catch {
    return NextResponse.json({ error: "Nearby search failed", data: [] }, { status: 502 });
  }
}
