import { prisma } from "@/lib/prisma";

// A compact per-user behavior profile. Mixes cheap lifetime relation counts (always
// available, even before V3 logging) with UserInteraction-derived signals (browse
// behavior + recency). Powers the personalized retention nudge and future recs.
export type BehaviorProfile = {
  posts: number;
  mixes: number; // saved Mix Lab creations
  parties: number;
  connections: number;
  reviews: number;
  searches: number;
  jamesAsks: number;
  views: number;
  lastActiveAt: Date | null;
};

export async function getBehaviorProfile(userId: string): Promise<BehaviorProfile> {
  const [counts, groups, lastInteraction, connections] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: { posts: true, cocktailCreations: true, partyPlans: true, drinkReviews: true },
        },
      },
    }),
    prisma.userInteraction.groupBy({
      by: ["interactionType"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.userInteraction.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.connection.count({ where: { OR: [{ userAId: userId }, { userBId: userId }] } }),
  ]);

  const byType = new Map(groups.map((g) => [g.interactionType, g._count._all]));
  return {
    posts: counts?._count.posts ?? 0,
    mixes: counts?._count.cocktailCreations ?? 0,
    parties: counts?._count.partyPlans ?? 0,
    connections,
    reviews: counts?._count.drinkReviews ?? 0,
    searches: byType.get("SEARCH") ?? 0,
    jamesAsks: byType.get("ASK_JAMES") ?? 0,
    views: (byType.get("VIEW") ?? 0) + (byType.get("CLICK_DRINK") ?? 0),
    lastActiveAt: lastInteraction?.createdAt ?? null,
  };
}

export type RetentionPitch = { key: string; headline: string; body: string; href: string };

// Heuristic personalization (v1): pitch the highest-value feature the user has
// under-used. Deterministic, instant, no LLM. Order = priority.
export function pickRetentionPitch(p: BehaviorProfile): RetentionPitch {
  if (p.mixes === 0)
    return {
      key: "mixlab",
      headline: "Build your first cocktail",
      body: "The 3D Mix Lab lets you pour, stir and garnish your own drink — then save it to your shelf.",
      href: "/mix",
    };
  if (p.parties === 0)
    return {
      key: "parties",
      headline: "Throw a round",
      body: "Plan a night with your circle — pick the drinks, games and vibe together.",
      href: "/parties",
    };
  if (p.connections < 3)
    return {
      key: "circle",
      headline: "Bring your crew",
      body: "Sip Stories is better with friends. Invite a few and build your circle.",
      href: "/search",
    };
  if (p.posts === 0)
    return {
      key: "post",
      headline: "Share a story",
      body: "Your first sip story is one tap away — the feed is waiting.",
      href: "/",
    };
  return {
    key: "mixlab",
    headline: "Have you tried the 3D Mix Lab?",
    body: "Pour, stir and garnish your own cocktail, then save it to your shelf.",
    href: "/mix",
  };
}

// A taste profile: stated preferences (onboarding) blended with demonstrated taste
// (the categories of drinks the user has actually been viewing). Powers James
// grounding + recommendations. Cheap: at most 3 queries, never on a hot path.
export type TasteProfile = {
  spirits: string[];
  flavours: string[];
  drinkingStyle: string | null;
  intensity: string | null;
  intent: string | null;
  favoriteDrink: string | null;
  topCategories: string[]; // behavioral — most-viewed drink categories
  recentDrinks: string[]; // recently viewed drink names (for James colour)
};

export async function getTasteProfile(userId: string): Promise<TasteProfile> {
  const [profile, views] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: {
        preferredSpirits: true,
        preferredFlavours: true,
        drinkingStyle: true,
        intensity: true,
        intent: true,
        favoriteDrink: { select: { name: true } },
      },
    }),
    prisma.userInteraction.findMany({
      where: { userId, interactionType: "CLICK_DRINK", targetType: "DRINK" },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { context: true },
    }),
  ]);

  const slugs = Array.from(
    new Set(
      views
        .map((v) => (v.context as { slug?: unknown } | null)?.slug)
        .filter((s): s is string => typeof s === "string"),
    ),
  ).slice(0, 20);

  let topCategories: string[] = [];
  let recentDrinks: string[] = [];
  if (slugs.length) {
    const drinks = await prisma.drink.findMany({
      where: { slug: { in: slugs } },
      select: { name: true, category: { select: { name: true } } },
    });
    recentDrinks = drinks.map((d) => d.name).slice(0, 8);
    const catCount = new Map<string, number>();
    for (const d of drinks) {
      const c = d.category?.name;
      if (c) catCount.set(c, (catCount.get(c) ?? 0) + 1);
    }
    topCategories = [...catCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c)
      .slice(0, 4);
  }

  return {
    spirits: profile?.preferredSpirits ?? [],
    flavours: profile?.preferredFlavours ?? [],
    drinkingStyle: profile?.drinkingStyle ?? null,
    intensity: profile?.intensity ?? null,
    intent: profile?.intent ?? null,
    favoriteDrink: profile?.favoriteDrink?.name ?? null,
    topCategories,
    recentDrinks,
  };
}

export type RecDrink = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
};

const REC_SELECT = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  brand: true,
  category: { select: { name: true } },
} as const;

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

// "Picked for you" — drinks ranked by the user's taste (categories they browse +
// stated spirits), most-reviewed first. Backfills with popular drinks on cold start
// or sparse taste, so the rail is never empty.
export async function getRecommendations(userId: string, take = 12): Promise<RecDrink[]> {
  const taste = await getTasteProfile(userId);
  const wanted = Array.from(new Set([...taste.topCategories, ...taste.spirits])).filter(Boolean);

  const matched = wanted.length
    ? await prisma.drink.findMany({
        where: { category: { name: { in: wanted } } },
        take,
        orderBy: { reviews: { _count: "desc" } },
        select: REC_SELECT,
      })
    : [];

  if (matched.length >= take) return matched.map(toRec);

  // Backfill with popular drinks not already included.
  const have = new Set(matched.map((d) => d.id));
  const extra = await prisma.drink.findMany({
    where: have.size ? { id: { notIn: [...have] } } : {},
    take: take - matched.length,
    orderBy: { reviews: { _count: "desc" } },
    select: REC_SELECT,
  });
  return [...matched, ...extra].map(toRec);
}
