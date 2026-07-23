import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type AddressComponent = {
  long_name: string;
  types: string[];
};

type GeocodeResult = {
  address_components?: AddressComponent[];
};

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function component(components: AddressComponent[], type: string): string | null {
  return components.find((c) => c.types.includes(type))?.long_name ?? null;
}

function cleanState(state: string | null): string | null {
  if (!state) return null;
  if (/delhi/i.test(state)) return "Delhi";
  return state;
}

function locationFromComponents(components: AddressComponent[]) {
  const city =
    component(components, "sublocality_level_1") ??
    component(components, "sublocality") ??
    component(components, "locality") ??
    component(components, "administrative_area_level_2");
  const state = cleanState(component(components, "administrative_area_level_1"));
  return city || state ? { city: city ?? undefined, state: state ?? undefined } : null;
}

const reverseGeocode = unstable_cache(
  async (lat: number, lng: number, key: string) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`,
    );
    if (!res.ok) throw new Error(`geocode ${res.status}`);
    const json = (await res.json()) as { results?: GeocodeResult[]; status?: string };
    if (json.status !== "OK") return null;
    for (const result of json.results ?? []) {
      const location = locationFromComponents(result.address_components ?? []);
      if (location?.city && location?.state) return location;
    }
    return null;
  },
  ["reverse-location"],
  { revalidate: 86400 },
);

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (
    !(await rateLimit(`location-reverse:${me.id}`, 20, 60_000)) ||
    !(await rateLimit(`location-reverse-ip:${clientIp(request)}`, 40, 60_000))
  ) {
    return NextResponse.json({ error: "Too many location lookups." }, { status: 429 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "Location lookup is not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));
  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: "Valid lat & lng required" }, { status: 400 });
  }

  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;

  try {
    return NextResponse.json({ data: await reverseGeocode(roundedLat, roundedLng, key) });
  } catch {
    return NextResponse.json({ error: "Location lookup failed" }, { status: 502 });
  }
}
