import type {
  CatalogCocktailEntry,
  CatalogDrinkEntry,
} from "@/types/database";

// Pure, dependency-free mappers from Prisma query projections to the canonical
// CatalogEntry shape (src/types/database.ts). No prisma import here on purpose so
// this module is safe to use on BOTH the server (mapping initial SSR data) and the
// client (mapping rows fetched from /api/*). Input types are structural to keep it
// decoupled from the Prisma client surface.

/** Matches the `cocktailSelect` projection in src/lib/cocktails.ts. */
export type CocktailSelectRow = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  categorySlug: string | null;
  glass: string | null;
  garnish: string | null;
  instructions: string | null;
  imageUrl: string | null;
  sourceLabel: string | null;
  isCurated: boolean;
  _count: { cheers: number };
  sourceBar: { id: string; name: string; slug: string; city: string } | null;
  ingredients: {
    sortOrder: number;
    ingredient: { name: string; slug: string; category: string } | null;
    drink: { name: string; slug: string } | null;
  }[];
};

/** Matches the `getDrinks` include (with abv already coerced to number). */
export type DrinkCatalogRow = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  imageUrl: string | null;
  abv: number | null;
  priceRange: string | null;
  basePriceInr: number | null;
  category: { name: string; slug: string };
  subcategory: { name: string } | null;
  _count: { reviews: number; posts: number };
};

function cocktailSubtitle(c: CocktailSelectRow): string | null {
  if (c.sourceBar) return `${c.sourceBar.name}, ${c.sourceBar.city}`;
  return c.sourceLabel ?? c.glass ?? null;
}

export function toCatalogCocktail(c: CocktailSelectRow): CatalogCocktailEntry {
  return {
    kind: "cocktail",
    id: c.id,
    name: c.name,
    slug: c.slug ?? null,
    category: c.category ?? null,
    categorySlug: c.categorySlug ?? null,
    imageUrl: c.imageUrl ?? null,
    subtitle: cocktailSubtitle(c),
    glass: c.glass ?? null,
    garnish: c.garnish ?? null,
    instructions: c.instructions ?? null,
    isCurated: c.isCurated,
    cheerCount: c._count.cheers,
    sourceBar: c.sourceBar,
    sourceLabel: c.sourceLabel ?? null,
    ingredients: c.ingredients.map((i) => ({
      sortOrder: i.sortOrder,
      ingredient: i.ingredient
        ? { name: i.ingredient.name, slug: i.ingredient.slug, category: i.ingredient.category }
        : null,
      drink: i.drink ? { name: i.drink.name, slug: i.drink.slug } : null,
    })),
  };
}

export function toCatalogDrink(d: DrinkCatalogRow): CatalogDrinkEntry {
  return {
    kind: "drink",
    id: d.id,
    name: d.name,
    slug: d.slug,
    category: d.category?.name ?? null,
    categorySlug: d.category?.slug ?? null,
    imageUrl: d.imageUrl ?? null,
    subtitle: d.brand ?? null,
    brand: d.brand ?? null,
    abv: d.abv ?? null,
    priceRange: d.priceRange ?? null,
    basePriceInr: d.basePriceInr ?? null,
    subcategory: d.subcategory?.name ?? null,
    counts: { reviews: d._count.reviews, posts: d._count.posts },
  };
}

export function toCatalogCocktails(rows: CocktailSelectRow[]): CatalogCocktailEntry[] {
  return rows.map(toCatalogCocktail);
}

export function toCatalogDrinks(rows: DrinkCatalogRow[]): CatalogDrinkEntry[] {
  return rows.map(toCatalogDrink);
}
