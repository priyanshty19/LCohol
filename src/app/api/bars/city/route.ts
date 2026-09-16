import { NextRequest, NextResponse } from "next/server";
import { getBars } from "@/lib/bars";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  CITY_SEARCH_AREAS,
  cityPlacePriceRange,
  cityTextQuery,
  dedupeCityPlaces,
  parseBarCity,
  parseCityCategory,
  type BarCity,
  type CityCategory,
  type CityGooglePlace,
} from "@/lib/city-places";
import { toOperationalNearbyBars } from "@/lib/nearby-places";

// GET /api/bars/city?city=..&type=..&q=..
//
// City browsing is our own curated directory PLUS a live Google Places
// "searchText" pass, because the directory only holds hand-curated rows: a real
// venue that was never curated used to be simply missing from search results.
// The live pass is best-effort — the curated rows are always returned, and any
// problem upstream (no key, throttled, slow, non-200) just means no extras.
//
// DENIAL-OF-WALLET: the Places call is BILLED, so it only runs for a signed-in,
// rate-limited caller, is memoised per query for a few minutes, and is capped by
// a hard timeout. The response is therefore per-user and privately cached.

export const dynamic = "force-dynamic";

const CACHE_HEADERS = { "Cache-Control": "private, max-age=60" };

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.priceLevel",
  "places.businessStatus",
  "places.primaryType",
  "places.types",
].join(",");

/** Only reach for Places when our own directory is thin, or the user is searching. */
const MIN_LOCAL_RESULTS = 12;
const MIN_QUERY_LENGTH = 2;
const PLACES_TIMEOUT_MS = 2_500;
const PLACES_CACHE_TTL_MS = 5 * 60_000;
const PLACES_CACHE_MAX = 200;

type CityPlaceBar = ReturnType<typeof toOperationalNearbyBars>[number];

// Small in-process memo so a debounced search (or several users on the same
// city tab) doesn't re-bill the same text query. Same spirit as the rounded
// coordinates in /api/bars/nearby.
const placesCache = new Map<string, { at: number; bars: CityPlaceBar[] }>();

async function searchCityPlaces(
  city: BarCity,
  category: CityCategory | null,
  search: string,
  key: string,
): Promise<CityPlaceBar[]> {
  const textQuery = cityTextQuery(city, category, search);
  const cached = placesCache.get(textQuery);
  if (cached && Date.now() - cached.at < PLACES_CACHE_TTL_MS) return cached.bars;

  const area = CITY_SEARCH_AREAS[city];
  const res = await fetch(PLACES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 20,
      locationBias: { circle: { center: area.center, radius: area.radius } },
    }),
    signal: AbortSignal.timeout(PLACES_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`places ${res.status}`);

  const json = (await res.json()) as { places?: CityGooglePlace[] };
  const places = json.places ?? [];
  // allowTextSearchMatches: the text query already carries the category wording,
  // so we must NOT re-filter on Google's coarse type list — that is what dropped
  // brewpubs and other venues Google tags as plain restaurants.
  const bars = toOperationalNearbyBars(places, null, true).map((bar) => {
    const place = places.find((p) => p.id === bar.id);
    return { ...bar, city, priceRange: cityPlacePriceRange(place?.priceLevel) };
  });

  if (placesCache.size >= PLACES_CACHE_MAX) placesCache.clear();
  placesCache.set(textQuery, { at: Date.now(), bars });
  return bars;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawCity = params.get("city");
  const rawType = params.get("type");
  const search = (params.get("q") ?? "").trim();

  const local = await getBars({ city: rawCity, type: rawType, q: search });

  const city = parseBarCity(rawCity);
  const category = parseCityCategory(rawType);
  const wantsLive =
    city !== null &&
    (search.length >= MIN_QUERY_LENGTH || local.length < MIN_LOCAL_RESULTS) &&
    (!rawType || category !== null);

  if (!wantsLive) {
    return NextResponse.json({ data: local }, { headers: CACHE_HEADERS });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  const me = key ? await getCurrentUser() : null;
  const allowed =
    !!key &&
    !!me &&
    !me.isBanned &&
    (await rateLimit(`bars-city:${me.id}`, 30, 60_000)) &&
    (await rateLimit(`bars-city-ip:${clientIp(request)}`, 60, 60_000));

  if (!allowed || !key) {
    // No key, signed out, or throttled: still a perfectly good directory answer.
    return NextResponse.json(
      { data: local, meta: { live: false } },
      { headers: CACHE_HEADERS },
    );
  }

  try {
    const external = await searchCityPlaces(city, category, search, key);
    const data = [...local, ...dedupeCityPlaces(local, external)];
    return NextResponse.json(
      { data, meta: { live: true, local: local.length, external: data.length - local.length } },
      { headers: CACHE_HEADERS },
    );
  } catch {
    // Timeout / upstream failure must never cost the user the curated list.
    return NextResponse.json({ data: local, meta: { live: false } }, { headers: CACHE_HEADERS });
  }
}
