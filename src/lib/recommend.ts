import { prisma } from "@/lib/prisma";
import {
  DRINK_FEATURE_SELECT,
  drinkFeatureTokens,
  tokensToVector,
  cosine,
  type Vector,
} from "@/lib/signals/content";

export type RecDrink = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
};

// Card fields + the content-feature fields, in one select.
const REC_SELECT = { ...DRINK_FEATURE_SELECT, name: true, imageUrl: true, brand: true } as const;

function toRec(d: {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  category: { name: string } | null;
}): RecDrink {
  return { id: d.id, name: d.name, slug: d.slug, imageUrl: d.imageUrl, brand: d.brand, category: d.category?.name ?? null };
}

// Drinks the user has demonstrably engaged with (reviews + recent views).
async function getEngagedDrinkIds(userId: string): Promise<string[]> {
  const [reviews, views] = await Promise.all([
    prisma.drinkReview.findMany({ where: { authorId: userId }, select: { drinkId: true }, take: 50 }),
    prisma.userInteraction.findMany({
      where: { userId, interactionType: "CLICK_DRINK", targetType: "DRINK" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { context: true },
    }),
  ]);
  const slugs = views
    .map((v) => (v.context as { slug?: unknown } | null)?.slug)
    .filter((s): s is string => typeof s === "string");
  const bySlug = slugs.length
    ? await prisma.drink.findMany({ where: { slug: { in: slugs } }, select: { id: true } })
    : [];
  return Array.from(new Set([...reviews.map((r) => r.drinkId), ...bySlug.map((d) => d.id)]));
}

// HYBRID recommender: blend collaborative (item-item neighbours of engaged drinks),
// content (cosine vs the precomputed taste vector) and popularity. Cold-start safe —
// with no signals it returns popular drinks. Reads the precompute tables, so it's cheap.
export async function recommendDrinks(userId: string, take = 12): Promise<RecDrink[]> {
  const [tasteRow, engaged] = await Promise.all([
    prisma.userTasteVector.findUnique({ where: { userId } }),
    getEngagedDrinkIds(userId),
  ]);
  const taste = (tasteRow?.vector as Vector | undefined) ?? {};
  const engagedSet = new Set(engaged);

  // Collaborative candidates — neighbours of the user's engaged drinks.
  const cfScore = new Map<string, number>();
  if (engaged.length) {
    const sims = await prisma.itemSimilarity.findMany({
      where: { itemType: "DRINK", itemAId: { in: engaged } },
      orderBy: { score: "desc" },
      take: 300,
      select: { itemBId: true, score: true },
    });
    for (const s of sims) {
      if (!engagedSet.has(s.itemBId)) cfScore.set(s.itemBId, (cfScore.get(s.itemBId) ?? 0) + s.score);
    }
  }

  // Popular drinks — for blend + cold-start backfill.
  const popular = await prisma.drink.findMany({
    take: 40,
    orderBy: { reviews: { _count: "desc" } },
    select: { id: true },
  });
  const popRank = new Map(popular.map((d, i) => [d.id, 1 - i / popular.length]));

  const candidateIds = Array.from(new Set([...cfScore.keys(), ...popular.map((d) => d.id)]))
    .filter((id) => !engagedSet.has(id))
    .slice(0, 80);
  if (!candidateIds.length) return [];

  const candidates = await prisma.drink.findMany({ where: { id: { in: candidateIds } }, select: REC_SELECT });

  const hasTaste = Object.keys(taste).length > 0;
  const maxCf = Math.max(1, ...cfScore.values());

  return candidates
    .map((d) => {
      const cf = (cfScore.get(d.id) ?? 0) / maxCf;
      const cb = hasTaste ? cosine(tokensToVector(drinkFeatureTokens(d)), taste) : 0;
      const pop = popRank.get(d.id) ?? 0;
      return { d, score: 0.5 * cf + 0.35 * cb + 0.15 * pop };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, take)
    .map(({ d }) => toRec(d));
}

// "More like this" — item-item neighbours of one drink, with a same-category content
// fallback when collaborative data is sparse.
export async function similarDrinks(drinkId: string, take = 8): Promise<RecDrink[]> {
  const sims = await prisma.itemSimilarity.findMany({
    where: { itemType: "DRINK", itemAId: drinkId },
    orderBy: { score: "desc" },
    take,
    select: { itemBId: true },
  });
  let ids = sims.map((s) => s.itemBId);

  if (ids.length < take) {
    const base = await prisma.drink.findUnique({ where: { id: drinkId }, select: { categoryId: true } });
    if (base) {
      const more = await prisma.drink.findMany({
        where: { categoryId: base.categoryId, id: { notIn: [drinkId, ...ids] } },
        take: take - ids.length,
        orderBy: { reviews: { _count: "desc" } },
        select: { id: true },
      });
      ids = [...ids, ...more.map((d) => d.id)];
    }
  }
  if (!ids.length) return [];

  const drinks = await prisma.drink.findMany({ where: { id: { in: ids } }, select: REC_SELECT });
  const order = new Map(ids.map((id, i) => [id, i]));
  return drinks.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map(toRec);
}
