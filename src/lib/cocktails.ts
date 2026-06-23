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
  category: true,
  glass: true,
  garnish: true,
  instructions: true,
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
