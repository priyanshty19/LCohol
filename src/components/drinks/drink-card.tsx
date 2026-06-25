import { EntryCard } from "@/components/catalog/entry-card";
import type { CatalogDrinkEntry } from "@/types/database";

// Thin adapter kept for backward compatibility: existing drink call sites
// (drinks-view, vibe-view, search-view) still pass the drink-row shape, but all
// rendering now funnels through the unified <EntryCard>. New code should prefer
// EntryCard with a mapped CatalogEntry directly.

interface DrinkCardProps {
  drink: {
    id: string;
    name: string;
    slug: string;
    brand?: string | null;
    imageUrl?: string | null;
    abv?: number | string | null;
    priceRange?: string | null;
    basePriceInr?: number | null;
    category: { name: string; slug?: string };
    subcategory?: { name: string } | null;
    _count: { reviews: number; posts: number };
  };
  stateCode?: string;
}

export function DrinkCard({ drink, stateCode = "DL" }: DrinkCardProps) {
  const entry: CatalogDrinkEntry = {
    kind: "drink",
    id: drink.id,
    name: drink.name,
    slug: drink.slug,
    category: drink.category?.name ?? null,
    categorySlug: drink.category?.slug ?? null,
    imageUrl: drink.imageUrl ?? null,
    subtitle: drink.brand ?? null,
    brand: drink.brand ?? null,
    abv: drink.abv == null ? null : Number(drink.abv),
    priceRange: drink.priceRange ?? null,
    basePriceInr: drink.basePriceInr ?? null,
    subcategory: drink.subcategory?.name ?? null,
    counts: { reviews: drink._count.reviews, posts: drink._count.posts },
  };

  return <EntryCard entry={entry} stateCode={stateCode} />;
}
