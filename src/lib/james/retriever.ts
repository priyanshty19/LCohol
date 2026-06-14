import { prisma } from "@/lib/prisma";

export type DrinkContext = {
  name: string;
  brand: string | null;
  category: string;
  priceRange: string | null;
  abv: number | null;
  description: string | null;
};

/**
 * Ground James in the real catalog: pull drinks matching the user's message, with
 * a popularity fallback. Keeps him from inventing brands we don't carry.
 */
export async function retrieveDrinks(query: string): Promise<DrinkContext[]> {
  const words = Array.from(
    new Set((query.toLowerCase().match(/[a-z]{3,}/g) ?? []).slice(0, 6))
  );

  let drinks: Awaited<ReturnType<typeof queryDrinks>> = [];
  if (words.length) {
    drinks = await queryDrinks({
      OR: words.flatMap((w) => [
        { name: { contains: w, mode: "insensitive" as const } },
        { brand: { contains: w, mode: "insensitive" as const } },
        { description: { contains: w, mode: "insensitive" as const } },
      ]),
    });
  }

  if (drinks.length === 0) {
    drinks = await queryDrinks(undefined, true);
  }

  return drinks.map((d) => ({
    name: d.name,
    brand: d.brand,
    category: d.category?.name ?? "drink",
    priceRange: d.priceRange,
    abv: d.abv ? Number(d.abv) : null,
    description: d.description,
  }));
}

function queryDrinks(where?: object, popular = false) {
  return prisma.drink.findMany({
    where: where ?? {},
    take: 6,
    orderBy: popular ? { isVerified: "desc" } : undefined,
    select: {
      name: true,
      brand: true,
      priceRange: true,
      abv: true,
      description: true,
      category: { select: { name: true } },
    },
  });
}

export function drinksContext(drinks: DrinkContext[]): string {
  if (!drinks.length) return "(catalog unavailable — suggest well-known Indian/global brands)";
  return drinks
    .map(
      (d) =>
        `- ${d.name}${d.brand ? ` (${d.brand})` : ""} — ${d.category}${
          d.priceRange ? `, ${d.priceRange.toLowerCase()}` : ""
        }${d.abv ? `, ${d.abv}% ABV` : ""}`
    )
    .join("\n");
}
