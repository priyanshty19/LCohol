import { unstable_cache } from "next/cache";
import { containsProfanity } from "@/lib/profanity";
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
  _count: { select: { cheers: true } },
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

/** Personalized, uncached list of mixes created by one user. */
export async function getMyCocktails(userId: string, take = 50) {
  const rows = await prisma.cocktailCreation.findMany({
    where: { authorId: userId, isCurated: false },
    orderBy: { createdAt: "desc" },
    take: Math.min(MAX_TAKE, Math.max(1, take)),
    select: cocktailSelect,
  });

  return rows.filter((cocktail) => !containsProfanity(cocktail.name));
}

/** Latest unique mixes that received a cheer, newest activity first. */
export async function getRecentCheersForCreator(userId: string, take = 8) {
  const events = await prisma.cocktailCheer.findMany({
    where: { cocktail: { authorId: userId, isCurated: false } },
    orderBy: { createdAt: "desc" },
    take: Math.max(take * 4, take),
    select: {
      createdAt: true,
      user: {
        select: {
          profile: { select: { displayName: true, username: true, avatarUrl: true } },
        },
      },
      cocktail: { select: cocktailSelect },
    },
  });

  const unique = new Map<string, (typeof events)[number]>();
  for (const event of events) {
    if (!unique.has(event.cocktail.id)) unique.set(event.cocktail.id, event);
    if (unique.size === take) break;
  }
  return Array.from(unique.values());
}

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

  // Drop pre-guard profane user-mix names (cursor stays valid — it points at a
  // real row id, we only trim the displayed slice).
  const cocktails = rows.filter((c) => !containsProfanity(c.name));

  return { cocktails, nextCursor };
}

// Read-through Data Cache in front of getCocktails. The catalog is slow-changing
// and the rows carry NO per-user or Prisma.Decimal fields (see cocktailSelect),
// so a shared 5-min cache is safe and serializes cleanly. This matters because
// the /api/cocktails route reads the query string, which forces the route
// dynamic — so its `export const revalidate` is silently ignored and every call
// would otherwise hit Postgres. Caching the *data* here absorbs request storms
// (crawlers, retry loops) without holding a session-pool slot per hit.
// unstable_cache keys on the stringified arguments, so we normalize first.
const cocktailsListCache = unstable_cache(
  (opts: CocktailsQuery) => getCocktails(opts),
  ["cocktails-list"],
  { revalidate: 300, tags: ["cocktails"] },
);

export function getCocktailsCached(opts: CocktailsQuery = {}) {
  const key: CocktailsQuery = {
    category: opts.category ?? null,
    barId: opts.barId ?? null,
    q: opts.q?.trim() || null,
    includeDiscover: Boolean(opts.includeDiscover),
    take: opts.take ?? COCKTAILS_DEFAULT_TAKE,
    cursor: opts.cursor ?? null,
  };
  return cocktailsListCache(key);
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
    cocktails: scored
      .filter((s) => !containsProfanity(s.c.name))
      .slice(0, take)
      .map((s) => ({ ...s.c, matched: s.matched })),
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
  const exact = await prisma.cocktailCreation.findFirst({
    where,
    select: { ...cocktailSelect, authorId: true, isPublic: true },
  });
  if (exact || UUID_RE.test(slugOrId)) return exact;

  // Legacy feed shares used `/cocktails/<readable-name>` before saved mixes
  // received a uniqueness suffix. Resolve those links to the newest matching
  // canonical slug so old recipe cards do not decay into 404s. The page still
  // applies its normal public/owner/circle gate after this lookup.
  return prisma.cocktailCreation.findFirst({
    where: { slug: { startsWith: `${slugOrId}-` } },
    orderBy: { createdAt: "desc" },
    select: { ...cocktailSelect, authorId: true, isPublic: true },
  });
}
