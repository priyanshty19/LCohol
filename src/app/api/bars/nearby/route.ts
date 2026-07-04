import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

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
  "places.primaryTypeDisplayName",
  "places.types",
].join(",");

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
};

// Only SUCCESSFUL lookups are cached: the function throws on upstream failure so
// errors aren't memoized for 10 minutes. Key = rounded lat/lng/radius (the args).
const fetchNearbyCached = unstable_cache(
  async (lat: number, lng: number, radius: number, key: string) => {
    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ["bar", "pub", "night_club"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      }),
    });
    if (!res.ok) throw new Error(`places ${res.status}`);
    const json = (await res.json()) as { places?: Place[] };
    return (json.places ?? [])
      .filter((p) => p.location)
      .map((p) => ({
        id: p.id,
        name: p.displayName?.text ?? "Unnamed bar",
        slug: p.id,
        type: (p.primaryTypeDisplayName?.text ?? p.types?.[0] ?? "Bar").toUpperCase(),
        city: "",
        address: p.formattedAddress ?? null,
        lat: p.location!.latitude,
        lng: p.location!.longitude,
        priceRange: null as string | null,
        rating: p.rating ?? null,
        bestsellers: [] as string[],
        description: null as string | null,
        external: true,
      }));
  },
  ["bars-nearby"],
  { revalidate: 600 },
);

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
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Valid lat & lng required", data: [] }, { status: 400 });
  }

  // Round to ~110m so nearby pans hit the same cache entry.
  const rLat = Math.round(lat * 1000) / 1000;
  const rLng = Math.round(lng * 1000) / 1000;

  try {
    const data = await fetchNearbyCached(rLat, rLng, radius, key);
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Nearby search failed", data: [] }, { status: 502 });
  }
}
