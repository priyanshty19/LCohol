export const NEARBY_CATEGORIES = ["PUB", "BAR", "BREWERY", "LOUNGE", "CLUB"] as const;

export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number];

export type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  businessStatus?:
    | "BUSINESS_STATUS_UNSPECIFIED"
    | "OPERATIONAL"
    | "CLOSED_TEMPORARILY"
    | "CLOSED_PERMANENTLY"
    | "FUTURE_OPENING";
  primaryType?: string;
  types?: string[];
};

const GOOGLE_TYPES: Record<NearbyCategory, readonly string[]> = {
  BAR: ["bar", "bar_and_grill", "cocktail_bar", "hookah_bar", "wine_bar"],
  PUB: ["brewpub", "gastropub", "irish_pub"],
  BREWERY: ["brewery", "brewpub", "beer_garden"],
  LOUNGE: ["lounge_bar"],
  CLUB: ["night_club"],
};

const ALL_GOOGLE_TYPES = [...new Set(Object.values(GOOGLE_TYPES).flat())];

function isSupportedGoogleBarPlace(place: Pick<GooglePlace, "primaryType" | "types">): boolean {
  const types = new Set([place.primaryType, ...(place.types ?? [])].filter(Boolean));
  return ALL_GOOGLE_TYPES.some((type) => types.has(type));
}

export function parseNearbyCategory(value: string | null): NearbyCategory | null {
  return NEARBY_CATEGORIES.includes(value as NearbyCategory) ? (value as NearbyCategory) : null;
}

export function googleTypesForCategory(category: NearbyCategory | null): string[] {
  return [...(category ? GOOGLE_TYPES[category] : ALL_GOOGLE_TYPES)];
}

export function categoryForGooglePlace(place: Pick<GooglePlace, "primaryType" | "types">): NearbyCategory {
  const types = new Set([place.primaryType, ...(place.types ?? [])].filter(Boolean));
  if (types.has("night_club")) return "CLUB";
  if (["brewery", "beer_garden"].some((type) => types.has(type))) return "BREWERY";
  if (["brewpub", "gastropub", "irish_pub"].some((type) => types.has(type))) return "PUB";
  if (types.has("lounge_bar")) return "LOUNGE";
  return "BAR";
}

export function placeMatchesGoogleCategory(
  place: Pick<GooglePlace, "primaryType" | "types">,
  category: NearbyCategory,
): boolean {
  const types = new Set([place.primaryType, ...(place.types ?? [])].filter(Boolean));
  return GOOGLE_TYPES[category].some((type) => types.has(type));
}

export function toOperationalNearbyBars(
  places: GooglePlace[],
  requestedCategory: NearbyCategory | null = null,
  allowTextSearchMatches = false,
) {
  return places
    .filter((place) => place.location && place.businessStatus === "OPERATIONAL")
    .filter((place) =>
      requestedCategory
        ? placeMatchesGoogleCategory(place, requestedCategory)
        : allowTextSearchMatches || isSupportedGoogleBarPlace(place),
    )
    .map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? "Unnamed bar",
      slug: place.id,
      type: requestedCategory ?? categoryForGooglePlace(place),
      city: "",
      address: place.formattedAddress ?? null,
      lat: place.location!.latitude,
      lng: place.location!.longitude,
      priceRange: null as string | null,
      rating: place.rating ?? null,
      bestsellers: [] as string[],
      description: null as string | null,
      external: true,
    }));
}

export function filterNearbyBars<T extends { name: string; address: string | null; type: string }>(
  bars: T[],
  query: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return bars;

  return bars.filter((bar) =>
    [bar.name, bar.address, bar.type].some((value) =>
      value?.toLocaleLowerCase().includes(normalizedQuery),
    ),
  );
}
