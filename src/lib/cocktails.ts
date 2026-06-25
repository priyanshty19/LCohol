import { prisma } from "@/lib/prisma";

// Shared cocktail-list query. Used by BOTH the API route (client pagination /
// filters) and the cocktails page server component (initial render), so the
// two stay in lockstep. Server-only by virtue of importing prisma.

export const COCKTAILS_DEFAULT_TAKE = 24;
const MAX_TAKE = 100;

export type CocktailsQuery = {
  category?: string | null;
  barId?: string | null;
  q?: string | null;
  includeDiscover?: boolean;
  take?: number;
  cursor?: string | null;
};

export const cocktailSelect = {
  id: true,
  name: true,
  slug: true,
  category: true,
  categorySlug: true,
  glass: true,
  garnish: true,
  instructions: true,
  imageUrl: true,
  sourceLabel: true,
  isCurated: true,
  sourceBar: { select: { id: true, name: true, slug: true, city: true } },
  ingredients: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      sortOrder: true,
      ingredient: { select: { name: true, slug: true, category: true } },
      drink: { select: { name: true, slug: true } },
    },
  },
} as const;

export type CocktailRow = Awaited<ReturnType<typeof getCocktails>>["cocktails"][number];

export async function getCocktails(opts: CocktailsQuery = {}) {
  const take = Math.min(MAX_TAKE, Math.max(1, opts.take ?? COCKTAILS_DEFAULT_TAKE));

  const where: Record<string, unknown> = { isPublic: true };
  if (!opts.includeDiscover) where.isCurated = true;
  if (opts.category) where.category = opts.category;
  if (opts.barId) where.sourceBarId = opts.barId;
  if (opts.q) where.name = { contains: opts.q, mode: "insensitive" };

  const rows = await prisma.cocktailCreation.findMany({
    where,
    take: take + 1,
    ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
    orderBy: [{ isCurated: "desc" }, { name: "asc" }],
    select: cocktailSelect,
  });

  let nextCursor: string | null = null;
  if (rows.length > take) {
    const next = rows.pop()!;
    nextCursor = next.id;
  }

  return { cocktails: rows, nextCursor };
}

// Ingredient-aware search ("the way James acts"): given a set of ingredient
// slugs, return cocktails that use any of them, ranked by how MANY of the
// selected ingredients each contains. Pure data, no LLM — mirrors searchCatalog's
// philosophy. Match on BOTH ingredient.slug and drink.slug because a recipe line
// can point at a normalized Ingredient OR a Drink (CocktailIngredient.ingredientId
// is nullable). Each returned row carries `matched` for a "has 3 of 4" label.
export async function searchByIngredients(
  slugs: string[],
  opts: { includeDiscover?: boolean; take?: number } = {},
) {
  const want = Array.from(new Set(slugs.filter((s) => typeof s === "string" && s)));
  if (!want.length) return { cocktails: [], selectedCount: 0 };

  const take = Math.min(MAX_TAKE, Math.max(1, opts.take ?? COCKTAILS_DEFAULT_TAKE));
  const where: Record<string, unknown> = {
    isPublic: true,
    ingredients: {
      some: {
        OR: [{ ingredient: { slug: { in: want } } }, { drink: { slug: { in: want } } }],
      },
    },
  };
  if (!opts.includeDiscover) where.isCurated = true;

  // Pull a generous candidate window so JS overlap-ranking surfaces the best
  // matches rather than just the first `take` alphabetically.
  const candidates = await prisma.cocktailCreation.findMany({
    where,
    take: 200,
    orderBy: [{ isCurated: "desc" }, { name: "asc" }],
    select: cocktailSelect,
  });

  const wantSet = new Set(want);
  const scored = candidates.map((c) => {
    const have = new Set<string>();
    for (const ci of c.ingredients) {
      const s = ci.ingredient?.slug ?? ci.drink?.slug;
      if (s && wantSet.has(s)) have.add(s);
    }
    return { c, matched: have.size };
  });
  scored.sort(
    (a, b) =>
      b.matched - a.matched ||
      (a.c.isCurated === b.c.isCurated ? a.c.name.localeCompare(b.c.name) : a.c.isCurated ? -1 : 1),
  );

  return {
    cocktails: scored.slice(0, take).map((s) => ({ ...s.c, matched: s.matched })),
    selectedCount: want.length,
  };
}

// Single cocktail by slug (or uuid fallback) for the SSR detail route. Mirrors
// the drinks /[id] resolve-by-slug-or-uuid pattern.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCocktailBySlug(slugOrId: string) {
  const where = UUID_RE.test(slugOrId)
    ? { OR: [{ slug: slugOrId }, { id: slugOrId }] }
    : { slug: slugOrId };
  // Return regardless of visibility; the page enforces (public OR owner) so a
  // user can view their own private "My Mix" while others get a 404.
  return prisma.cocktailCreation.findFirst({
    where,
    select: { ...cocktailSelect, authorId: true, isPublic: true },
  });
}
