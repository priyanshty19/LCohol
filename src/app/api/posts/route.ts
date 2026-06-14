import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FEED_PAGE_SIZE } from "@/lib/constants";

/** Accept an image URL only if it is https, on OUR Supabase project host, and
 *  under the public storage path. Structural checks — no substring matching. */
function sanitizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  let appHost: string;
  try {
    appHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
  if (!appHost) return null;
  try {
    const u = new URL(value);
    const ok =
      u.protocol === "https:" &&
      u.hostname === appHost &&
      u.pathname.startsWith("/storage/v1/object/public/");
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "new";
  const cursor = searchParams.get("cursor");
  const postType = searchParams.get("type");

  const where = {
    isDeleted: false,
    ...(postType ? { postType: postType as any } : {}),
  };

  const include = {
    author: {
      select: {
        profile: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
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

  // "hot" uses a Reddit-style time-decayed engagement ranking computed in-app
  // over a recent candidate window. Pagination is VALUE-based keyset on the
  // (hotScore, id) tuple — not an offset into the re-sorted array — so pages
  // never skip/duplicate and the cursor needs no lookup even if its post left
  // the window. The cursor is the opaque string `${hot}_${id}` of the last item.
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
        // log10 of engagement (early votes weigh most) + age boost (newer = higher).
        const hot =
          sign * Math.log10(Math.max(Math.abs(eng), 1)) +
          new Date(p.createdAt).getTime() / 45_000_000;
        return { p, hot };
      })
      // hot desc, id desc as a stable tie-break so the keyset is total-ordered.
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

    return NextResponse.json({
      data: shown.map((x) => x.p),
      hasMore,
      nextCursor: hasMore && last ? `${last.hot}_${last.p.id}` : undefined,
    });
  }

  const orderBy =
    sort === "top"
      ? [{ score: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const posts = await prisma.post.findMany({
    where,
    orderBy,
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include,
  });

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const data = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  return NextResponse.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
  });
}

export async function POST(request: Request) {
  const dbUser = await getCurrentUser();

  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (dbUser.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const body = await request.json();
  const { title, body: postBody, postType, tagIds, drinkIds, imageUrl } = body;

  if (!title || !postType) {
    return NextResponse.json(
      { error: "Title and post type are required" },
      { status: 400 }
    );
  }

  // Only accept image URLs we host on OUR Supabase Storage public bucket.
  // Parse structurally (host + path) — never a substring regex, which would
  // accept https://evil.com/?x=.supabase.co/storage/ and turn every viewer's
  // browser into a beacon for an attacker-controlled URL.
  const safeImageUrl = sanitizeImageUrl(imageUrl);

  const post = await prisma.post.create({
    data: {
      authorId: dbUser.id,
      title,
      body: postBody || null,
      postType,
      imageUrl: safeImageUrl,
      tags: tagIds?.length
        ? { create: tagIds.map((id: string) => ({ tagId: id })) }
        : undefined,
      drinks: drinkIds?.length
        ? { create: drinkIds.map((id: string) => ({ drinkId: id })) }
        : undefined,
    },
    include: {
      author: {
        select: {
          profile: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      tags: { include: { tag: true } },
      drinks: {
        include: {
          drink: { select: { id: true, name: true, slug: true, imageUrl: true } },
        },
      },
      _count: { select: { comments: true, votes: true } },
    },
  });

  return NextResponse.json({ data: post }, { status: 201 });
}
