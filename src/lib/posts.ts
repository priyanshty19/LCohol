import { PostType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import { getTasteProfile } from "@/lib/behavior";
import { cachedOrCompute } from "@/lib/feed-cache";

// Shared feed query — used by the API route (client pagination/sort) and the
// feed page server component (initial render). The audience filter is passed in
// (viewer + circle) so callers compute auth once.

export type PostsFeedQuery = {
  sort?: string;
  cursor?: string | null;
  postType?: string | null;
  viewerId?: string | null;
  connectionIds?: string[];
};

const include = {
  author: {
    select: {
      profile: { select: { username: true, displayName: true, avatarUrl: true } },
    },
  },
  tags: { include: { tag: true } },
  drinks: {
    include: {
      drink: { select: { id: true, name: true, slug: true, imageUrl: true } },
    },
  },
  _count: { select: { comments: true, votes: true } },
} as const;

/** PUBLIC for everyone; CIRCLE posts only for the viewer + their connections. */
function audienceWhere(viewerId?: string | null, connectionIds: string[] = []): Prisma.PostWhereInput {
  if (!viewerId) return { visibility: "PUBLIC" };
  const circleAuthorIds = [viewerId, ...connectionIds];
  return {
    OR: [
      { visibility: "PUBLIC" },
      { visibility: "CIRCLE", authorId: { in: circleAuthorIds } },
    ],
  };
}

export async function getPostsFeed(opts: PostsFeedQuery = {}) {
  const sort = opts.sort || "new";
  const cursor = opts.cursor;

  const where: Prisma.PostWhereInput = {
    isDeleted: false,
    ...(opts.postType ? { postType: opts.postType as PostType } : {}),
    ...audienceWhere(opts.viewerId, opts.connectionIds),
  };

  // "for-you" — the hot ranking PLUS personal affinity boosts: posts from people in
  // your circle, and posts featuring drinks you've recently been viewing. Same
  // bounded-window + value-keyset approach as hot, so it stays fast and paginates.
  // Logged-out (no viewerId) falls through to the plain branches below.
  if (sort === "for-you" && opts.viewerId) {
    const taste = await getTasteProfile(opts.viewerId);
    const recentDrinks = new Set(taste.recentDrinks);
    const circle = new Set(opts.connectionIds ?? []);
    const FY_WINDOW = 500;

    // `where` already scopes CIRCLE visibility to this specific viewer, so keying
    // the cache by viewerId can never leak one viewer's candidates to another.
    const candidates = await cachedOrCompute(
      `feed:foryou:${opts.viewerId}:${opts.postType ?? "all"}`,
      30,
      () =>
        prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" as const },
          take: FY_WINDOW,
          include,
        }),
    );

    const ranked = candidates
      .map((p) => {
        const eng = p.score + 2 * p._count.comments;
        const sign = eng > 0 ? 1 : eng < 0 ? -1 : 0;
        const hot =
          sign * Math.log10(Math.max(Math.abs(eng), 1)) +
          new Date(p.createdAt).getTime() / 45_000_000;
        // Boosts are calibrated against the time term (1.0 ≈ 12.5h of recency):
        // a circle post ranks as if ~1.5 days newer; a drink-you-eyed post ~1 day.
        let bonus = 0;
        if (circle.has(p.authorId)) bonus += 3;
        if (p.drinks.some((d) => recentDrinks.has(d.drink.name))) bonus += 2;
        return { p, fy: hot + bonus };
      })
      .sort((a, b) => b.fy - a.fy || (a.p.id < b.p.id ? 1 : -1));

    let after = ranked;
    if (cursor) {
      const sep = cursor.lastIndexOf("_");
      const curFy = Number(cursor.slice(0, sep));
      const curId = cursor.slice(sep + 1);
      if (!Number.isNaN(curFy)) {
        after = ranked.filter(({ p, fy }) => fy < curFy || (fy === curFy && p.id < curId));
      }
    }

    const page = after.slice(0, FEED_PAGE_SIZE + 1);
    const hasMore = page.length > FEED_PAGE_SIZE;
    const shown = hasMore ? page.slice(0, FEED_PAGE_SIZE) : page;
    const last = shown[shown.length - 1];

    return {
      data: shown.map((x) => x.p),
      hasMore,
      nextCursor: hasMore && last ? `${last.fy}_${last.p.id}` : undefined,
    };
  }

  // "hot" — Reddit-style time-decayed ranking over a recent candidate window,
  // VALUE-based keyset on the (hotScore, id) tuple. Cursor = `${hot}_${id}`.
  if (sort === "hot") {
    const HOT_WINDOW = 500;
    const postTypeFilter: Prisma.PostWhereInput = opts.postType
      ? { postType: opts.postType as PostType }
      : {};

    // Cache only the PUBLIC candidate window under a global key — safe to share
    // across every viewer. CIRCLE posts are always fetched fresh, scoped to this
    // viewer's own connections, and merged in below — never cached, so a CIRCLE
    // post can never leak to a non-connection through the shared PUBLIC entry.
    const publicCandidates = await cachedOrCompute(
      `feed:hot:${opts.postType ?? "all"}`,
      45,
      () =>
        prisma.post.findMany({
          where: { isDeleted: false, visibility: "PUBLIC", ...postTypeFilter },
          orderBy: { createdAt: "desc" as const },
          take: HOT_WINDOW,
          include,
        }),
    );

    let candidates = publicCandidates;
    const circleAuthorIds = opts.viewerId ? [opts.viewerId, ...(opts.connectionIds ?? [])] : [];
    if (circleAuthorIds.length) {
      const circlePosts = await prisma.post.findMany({
        where: {
          isDeleted: false,
          visibility: "CIRCLE",
          authorId: { in: circleAuthorIds },
          ...postTypeFilter,
        },
        orderBy: { createdAt: "desc" as const },
        take: HOT_WINDOW,
        include,
      });
      if (circlePosts.length) {
        const seen = new Set(candidates.map((p) => p.id));
        candidates = [...candidates, ...circlePosts.filter((p) => !seen.has(p.id))];
      }
    }

    const ranked = candidates
      .map((p) => {
        const eng = p.score + 2 * p._count.comments;
        const sign = eng > 0 ? 1 : eng < 0 ? -1 : 0;
        const hot =
          sign * Math.log10(Math.max(Math.abs(eng), 1)) +
          new Date(p.createdAt).getTime() / 45_000_000;
        return { p, hot };
      })
      .sort((a, b) => b.hot - a.hot || (a.p.id < b.p.id ? 1 : -1));

    let after = ranked;
    if (cursor) {
      const sep = cursor.lastIndexOf("_");
      const curHot = Number(cursor.slice(0, sep));
      const curId = cursor.slice(sep + 1);
      if (!Number.isNaN(curHot)) {
        after = ranked.filter(
          ({ p, hot }) => hot < curHot || (hot === curHot && p.id < curId)
        );
      }
    }

    const page = after.slice(0, FEED_PAGE_SIZE + 1);
    const hasMore = page.length > FEED_PAGE_SIZE;
    const shown = hasMore ? page.slice(0, FEED_PAGE_SIZE) : page;
    const last = shown[shown.length - 1];

    return {
      data: shown.map((x) => x.p),
      hasMore,
      nextCursor: hasMore && last ? `${last.hot}_${last.p.id}` : undefined,
    };
  }

  const orderBy =
    sort === "top" ? [{ score: "desc" as const }] : [{ createdAt: "desc" as const }];

  const posts = await prisma.post.findMany({
    where,
    orderBy,
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include,
  });

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const data = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  return {
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
  };
}
