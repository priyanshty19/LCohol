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
