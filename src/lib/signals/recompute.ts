import { prisma } from "@/lib/prisma";
import {
  DRINK_FEATURE_SELECT,
  drinkFeatureTokens,
  reviewWeight,
  CLICK_DRINK_WEIGHT,
  FAVORITE_WEIGHT,
  type Vector,
} from "@/lib/signals/content";

// Bounds — keep the whole recompute inside a serverless function. At larger scale
// this becomes a chunked/queued job, but these caps hold for the current corpus.
const MAX_VIEWS = 50_000; // recent drink views considered
const MAX_ITEMS_PER_USER = 50; // cap a user's history (CF cost is items²/user)
const TOP_NEIGHBOURS = 20; // stored similar items per drink

function addCo(co: Map<string, Map<string, number>>, a: string, b: string, v: number) {
  let m = co.get(a);
  if (!m) {
    m = new Map();
    co.set(a, m);
  }
  m.set(b, (m.get(b) ?? 0) + v);
}

// Rebuild the two precompute tables (UserTasteVector + ItemSimilarity) from the
// engagement matrix: reviews (rating-weighted) + drink views + favourites.
export async function recomputeSignals(): Promise<{
  users: number;
  drinks: number;
  pairs: number;
}> {
  // 1) Drink feature map (id → tokens) + slug→id for resolving slug-keyed views.
  const drinks = await prisma.drink.findMany({ select: DRINK_FEATURE_SELECT });
  const drinkTokens = new Map<string, string[]>();
  const slugToId = new Map<string, string>();
  for (const d of drinks) {
    drinkTokens.set(d.id, drinkFeatureTokens(d));
    slugToId.set(d.slug, d.id);
  }

  // 2) Engagement matrix: Map<userId, Map<drinkId, weight>>.
  const [reviews, views, favorites] = await Promise.all([
    prisma.drinkReview.findMany({ select: { authorId: true, drinkId: true, rating: true } }),
    prisma.userInteraction.findMany({
      where: { interactionType: "CLICK_DRINK", targetType: "DRINK" },
      orderBy: { createdAt: "desc" },
      take: MAX_VIEWS,
      select: { userId: true, context: true },
    }),
    prisma.profile.findMany({
      where: { favoriteDrinkId: { not: null } },
      select: { userId: true, favoriteDrinkId: true },
    }),
  ]);

  const userItems = new Map<string, Map<string, number>>();
  const add = (u: string, d: string | null | undefined, w: number) => {
    if (!d || !drinkTokens.has(d) || w <= 0) return;
    let m = userItems.get(u);
    if (!m) {
      m = new Map();
      userItems.set(u, m);
    }
    m.set(d, (m.get(d) ?? 0) + w);
  };
  for (const r of reviews) add(r.authorId, r.drinkId, reviewWeight(r.rating));
  for (const v of views) {
    const slug = (v.context as { slug?: unknown } | null)?.slug;
    if (typeof slug === "string") add(v.userId, slugToId.get(slug), CLICK_DRINK_WEIGHT);
  }
  for (const f of favorites) add(f.userId, f.favoriteDrinkId, FAVORITE_WEIGHT);

  // 3) UserTasteVector — weighted sum of engaged drinks' feature tokens.
  let userCount = 0;
  for (const [userId, items] of userItems) {
    const vec: Vector = {};
    for (const [drinkId, w] of items) {
      for (const tok of drinkTokens.get(drinkId) ?? []) vec[tok] = (vec[tok] ?? 0) + w;
    }
    await prisma.userTasteVector.upsert({
      where: { userId },
      create: { userId, vector: vec },
      update: { vector: vec },
    });
    userCount++;
  }

  // 4) ItemSimilarity — co-engagement cosine. For each user, accumulate weighted
  // co-occurrence over the top items in their history; normalize by item norms.
  const co = new Map<string, Map<string, number>>();
  const norm = new Map<string, number>();
  for (const [, items] of userItems) {
    const arr = [...items.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_ITEMS_PER_USER);
    for (const [d, w] of arr) norm.set(d, (norm.get(d) ?? 0) + w * w);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const prod = arr[i][1] * arr[j][1];
        addCo(co, arr[i][0], arr[j][0], prod);
        addCo(co, arr[j][0], arr[i][0], prod);
      }
    }
  }

  const simRows: { itemAId: string; itemBId: string; score: number }[] = [];
  for (const [a, bs] of co) {
    const na = norm.get(a);
    if (!na) continue;
    const scored = [...bs.entries()]
      .map(([b, dot]) => ({ b, s: dot / Math.sqrt(na * (norm.get(b) ?? 1)) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, TOP_NEIGHBOURS);
    for (const { b, s } of scored) simRows.push({ itemAId: a, itemBId: b, score: s });
  }

  // Replace the DRINK similarity rows wholesale.
  await prisma.itemSimilarity.deleteMany({ where: { itemType: "DRINK" } });
  for (let i = 0; i < simRows.length; i += 1000) {
    await prisma.itemSimilarity.createMany({
      data: simRows.slice(i, i + 1000).map((r) => ({ itemType: "DRINK", ...r })),
      skipDuplicates: true,
    });
  }

  return { users: userCount, drinks: drinkTokens.size, pairs: simRows.length };
}
