import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  CITY_SEARCH_AREAS,
  cityCategoryAsNearby,
  cityTextQuery,
  parseBarCity,
  parseCityCategory,
  type CityCategory,
  type CityGooglePlace,
  type BarCity,
} from "@/lib/city-places";
import { toOperationalNearbyBars } from "@/lib/nearby-places";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
  "nextPageToken",
].join(",");

const fetchCityPlacesCached = unstable_cache(
  async (
    city: BarCity,
    category: CityCategory | null,
    search: string,
    pageToken: string,
    key: string,
  ) => {
    const body: Record<string, unknown> = {
      textQuery: cityTextQuery(city, category, search),
      pageSize: 20,
      regionCode: "IN",
      languageCode: "en",
      locationBias: { circle: CITY_SEARCH_AREAS[city] },
    };
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`places ${response.status}`);

    const json = (await response.json()) as {
      places?: CityGooglePlace[];
      nextPageToken?: string;
    };
    const googleCategory = cityCategoryAsNearby(category);
    const data = toOperationalNearbyBars(
      json.places ?? [],
      googleCategory,
      category === "BYOB",
    ).map((place) => ({
      ...place,
      type: category ?? place.type,
      city,
    }));

    return { data, nextPageToken: json.nextPageToken ?? null };
  },
  ["bars-city-google-v1"],
  { revalidate: 600 },
);

export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended", data: [] }, { status: 403 });
  if (
    !(await rateLimit(`bars-city:${me.id}`, 30, 60_000)) ||
    !(await rateLimit(`bars-city-ip:${clientIp(request)}`, 60, 60_000))
  ) {
    return NextResponse.json(
      { error: "Too many bar searches. Please slow down.", data: [] },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Live city search is not configured yet.", data: [] },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const city = parseBarCity(searchParams.get("city"));
  const rawCategory = searchParams.get("type");
  const category = parseCityCategory(rawCategory);
  const search = (searchParams.get("q") ?? "").trim().slice(0, 80);
  const pageToken = (searchParams.get("pageToken") ?? "").trim();

  if (!city) return NextResponse.json({ error: "Unsupported city", data: [] }, { status: 400 });
  if (rawCategory && !category) {
    return NextResponse.json({ error: "Unsupported bar type", data: [] }, { status: 400 });
  }
  if (pageToken.length > 2048) {
    return NextResponse.json({ error: "Invalid page token", data: [] }, { status: 400 });
  }

  try {
    const result = await fetchCityPlacesCached(city, category, search, pageToken, key);
    return NextResponse.json({
      ...result,
      meta: { city, category: cityCategoryAsNearby(category) ?? category, count: result.data.length },
    });
  } catch {
    return NextResponse.json({ error: "Live city search failed", data: [] }, { status: 502 });
  }
}
