import { PostType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FEED_PAGE_SIZE } from "@/lib/constants";

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

  // "hot" — Reddit-style time-decayed ranking over a recent candidate window,
  // VALUE-based keyset on the (hotScore, id) tuple. Cursor = `${hot}_${id}`.
  if (sort === "hot") {
    const HOT_WINDOW = 500;
    const candidates = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" as const },
      take: HOT_WINDOW,
      include,
    });

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
