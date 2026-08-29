import type { GooglePlace, NearbyCategory } from "./nearby-places";

export const BAR_CITIES = ["Delhi NCR", "Bangalore", "Pune", "Hyderabad", "Chandigarh"] as const;
export const CITY_CATEGORIES = ["PUB", "BAR", "BREWERY", "LOUNGE", "CLUB", "BYOB"] as const;

export type BarCity = (typeof BAR_CITIES)[number];
export type CityCategory = (typeof CITY_CATEGORIES)[number];

export const CITY_SEARCH_AREAS: Record<
  BarCity,
  { center: { latitude: number; longitude: number }; radius: number }
> = {
  "Delhi NCR": { center: { latitude: 28.55, longitude: 77.15 }, radius: 50_000 },
  Bangalore: { center: { latitude: 12.97, longitude: 77.61 }, radius: 35_000 },
  Pune: { center: { latitude: 18.53, longitude: 73.86 }, radius: 35_000 },
  Hyderabad: { center: { latitude: 17.43, longitude: 78.4 }, radius: 40_000 },
  Chandigarh: { center: { latitude: 30.73, longitude: 76.78 }, radius: 25_000 },
};

const CATEGORY_QUERY: Record<CityCategory, string> = {
  PUB: "pubs",
  BAR: "bars",
  BREWERY: "breweries and brewpubs",
  LOUNGE: "lounge bars",
  CLUB: "night clubs",
  BYOB: "BYOB restaurants and venues",
};

export type CityGooglePlace = GooglePlace & { priceLevel?: string };

export function parseBarCity(value: string | null): BarCity | null {
  return BAR_CITIES.includes(value as BarCity) ? (value as BarCity) : null;
}

export function parseCityCategory(value: string | null): CityCategory | null {
  return CITY_CATEGORIES.includes(value as CityCategory) ? (value as CityCategory) : null;
}

export function cityTextQuery(city: BarCity, category: CityCategory | null, search: string): string {
  const term = search.trim().slice(0, 80);
  if (term) return `${term} ${category ? CATEGORY_QUERY[category] : "bars and nightlife"} in ${city}, India`;
  return `${category ? CATEGORY_QUERY[category] : "bars, pubs, breweries, lounge bars and night clubs"} in ${city}, India`;
}

export function cityCategoryAsNearby(category: CityCategory | null): NearbyCategory | null {
  return category === "BYOB" ? null : category;
}
