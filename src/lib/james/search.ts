import { prisma } from "@/lib/prisma";

// Shared catalog search used by James (the agent's find_drinks tool). Returns
// top matches across cocktails + drinks plus a "similar" row from the dominant
// category of the top hit. Pure data — no LLM, no auth (callers gate access).

export type CatalogItem = {
  kind: "cocktail" | "drink";
  id: string;
  name: string;
  category: string | null;
  subtitle: string | null;
  slug: string | null;
};

export type CatalogSearch = { results: CatalogItem[]; similar: CatalogItem[] };

const TAKE = 6;
const MAX_RESULTS = 8;

const cocktailSelect = {
  id: true,
  name: true,
  slug: true,
  category: true,
  glass: true,
  sourceLabel: true,
  sourceBar: { select: { name: true, city: true } },
} as const;

function cocktailSubtitle(c: {
  sourceBar: { name: string; city: string } | null;
  sourceLabel: string | null;
  glass: string | null;
}): string | null {
  if (c.sourceBar) return `${c.sourceBar.name}, ${c.sourceBar.city}`;
  return c.sourceLabel ?? c.glass;
}

// Tokenize so a phrasey query ("refreshing gin cocktails") still matches on any
// meaningful word, not the whole string as one substring (which matches nothing).
const STOPWORDS = new Set(["the", "and", "for", "show", "some", "any", "with", "give", "find", "drink", "drinks", "cocktail", "cocktails"]);

function queryWords(q: string): string[] {
  return Array.from(new Set((q.toLowerCase().match(/[a-z]{3,}/g) ?? [])))
    .filter((w) => !STOPWORDS.has(w))
    .slice(0, 6);
}

async function fuzzyIds(table: "cocktail" | "drink", terms: string[]): Promise<string[]> {
  try {
    const matches = await Promise.all(
      terms.slice(0, 3).map((term) =>
        table === "cocktail"
          ? prisma.$queryRaw<{ id: string }[]>`
              SELECT id FROM cocktail_creations
              WHERE is_public = true AND name % ${term}
              ORDER BY similarity(name, ${term}) DESC, is_curated DESC, score DESC, name ASC
              LIMIT ${TAKE}
            `
          : prisma.$queryRaw<{ id: string }[]>`
              SELECT id FROM drinks
              WHERE name % ${term}
              ORDER BY similarity(name, ${term}) DESC, is_verified DESC, name ASC
              LIMIT ${TAKE}
            `,
      ),
    );
    return Array.from(new Set(matches.flat().map((match) => match.id)));
  } catch {
    // Search still works with the regular indexed substring query while pg_trgm
    // is being enabled on an older environment.
    return [];
  }
}

export async function searchCatalog(rawQuery: string): Promise<CatalogSearch> {
  const q = rawQuery?.trim() ?? "";
  if (q.length < 2) return { results: [], similar: [] };

  const words = queryWords(q);
  const terms = words.length ? words : [q];
  const cocktailOr = terms.flatMap((w) => [
    { name: { contains: w, mode: "insensitive" as const } },
    { category: { contains: w, mode: "insensitive" as const } },
    { description: { contains: w, mode: "insensitive" as const } },
  ]);
  const drinkOr = terms.flatMap((w) => [
    { name: { contains: w, mode: "insensitive" as const } },
    { brand: { contains: w, mode: "insensitive" as const } },
    { description: { contains: w, mode: "insensitive" as const } },
  ]);

  const [cocktails, drinks, fuzzyCocktailIds, fuzzyDrinkIds] = await Promise.all([
    prisma.cocktailCreation.findMany({
      where: { isPublic: true, OR: cocktailOr },
      take: TAKE,
      orderBy: [{ isCurated: "desc" }, { score: "desc" }, { name: "asc" }],
      select: cocktailSelect,
    }),
    prisma.drink.findMany({
      where: { OR: drinkOr },
      take: TAKE,
      orderBy: { isVerified: "desc" },
      select: {
        id: true,
        name: true,
        brand: true,
        slug: true,
        category: { select: { name: true } },
      },
    }),
    fuzzyIds("cocktail", terms),
    fuzzyIds("drink", terms),
  ]);

  const [fuzzyCocktails, fuzzyDrinks] = await Promise.all([
    fuzzyCocktailIds.length
      ? prisma.cocktailCreation.findMany({
          where: { id: { in: fuzzyCocktailIds }, isPublic: true },
          select: cocktailSelect,
        })
      : Promise.resolve([]),
    fuzzyDrinkIds.length
      ? prisma.drink.findMany({
          where: { id: { in: fuzzyDrinkIds } },
          select: {
            id: true,
            name: true,
            brand: true,
            slug: true,
            category: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const cocktailById = new Map([...cocktails, ...fuzzyCocktails].map((cocktail) => [cocktail.id, cocktail]));
  const drinkById = new Map([...drinks, ...fuzzyDrinks].map((drink) => [drink.id, drink]));
  const fuzzyCocktailMatches = fuzzyCocktailIds
    .map((id) => cocktailById.get(id))
    .filter((cocktail): cocktail is (typeof cocktails)[number] => cocktail !== undefined);
  const fuzzyDrinkMatches = fuzzyDrinkIds
    .map((id) => drinkById.get(id))
    .filter((drink): drink is (typeof drinks)[number] => drink !== undefined);
  const orderedCocktails = [...cocktails, ...fuzzyCocktailMatches].filter(
    (cocktail, index, all) => all.findIndex((item) => item.id === cocktail.id) === index,
  );
  const orderedDrinks = [...drinks, ...fuzzyDrinkMatches].filter(
    (drink, index, all) => all.findIndex((item) => item.id === drink.id) === index,
  );

  const results: CatalogItem[] = [
    ...orderedCocktails.map((c) => ({
      kind: "cocktail" as const,
      id: c.id,
      name: c.name,
      category: c.category,
      subtitle: cocktailSubtitle(c),
      slug: c.slug,
    })),
    ...orderedDrinks.map((d) => ({
      kind: "drink" as const,
      id: d.id,
      name: d.name,
      category: d.category?.name ?? null,
      subtitle: d.brand,
      slug: d.slug,
    })),
  ].slice(0, MAX_RESULTS);

  const topCategory = results.find((r) => r.category)?.category ?? null;
  let similar: CatalogItem[] = [];
  if (topCategory) {
    const excludeIds = results.filter((r) => r.kind === "cocktail").map((r) => r.id);
    const more = await prisma.cocktailCreation.findMany({
      where: {
        isPublic: true,
        category: { equals: topCategory, mode: "insensitive" },
        id: { notIn: excludeIds },
      },
      take: TAKE,
      orderBy: [{ isCurated: "desc" }, { name: "asc" }],
      select: cocktailSelect,
    });
    similar = more.map((c) => ({
      kind: "cocktail" as const,
      id: c.id,
      name: c.name,
      category: c.category,
      subtitle: cocktailSubtitle(c),
      slug: c.slug,
    }));
  }

  return { results, similar };
}

// A compact text digest of search results, fed back to James as a tool result
// so he can talk about them in his own voice.
export function catalogDigest(search: CatalogSearch): string {
  const lines = search.results.map(
    (r) => `- ${r.name}${r.category ? ` (${r.category})` : ""}${r.subtitle ? ` — ${r.subtitle}` : ""}`
  );
  if (!lines.length) return "No matches in the catalog.";
  return lines.join("\n");
}
