import { NextResponse } from "next/server";

// GET /api/bars/nearby?lat=..&lng=..&radius=3000
// Real nearby bars via Google Places API (New) "searchNearby". The API key is
// read server-side only (GOOGLE_MAPS_API_KEY) so it is never exposed to the
// client. Returns the same Bar-ish shape the bars list/card already renders,
// with `external: true` so the UI knows these aren't our own catalog rows.
//
// Setup: add GOOGLE_MAPS_API_KEY to the environment (a billing-enabled key with
// the Places API (New) enabled). Until then this route returns 503 and the UI
// falls back to the curated city bars.

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

export async function GET(request: Request) {
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

  try {
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

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Places lookup failed", detail: detail.slice(0, 200), data: [] },
        { status: 502 },
      );
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
    const json = (await res.json()) as { places?: Place[] };
    const data = (json.places ?? [])
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

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Nearby search failed", data: [] }, { status: 502 });
  }
}
