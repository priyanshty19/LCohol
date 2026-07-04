import { NextResponse, after } from "next/server";
import { PostType, PostVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { getPostsFeed } from "@/lib/posts";
import { recomputeKarma } from "@/lib/karma";
import { persistMentions } from "@/lib/mentions";
import { notifyMany } from "@/lib/notifications";
import { logInteraction } from "@/lib/interactions";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

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
  // Public hot path: a 500-row include + JS ranking per call. Throttle per IP so
  // a ?sort=hot loop can't exhaust the pool for everyone. (WAF is the real backstop.)
  if (!(await rateLimit(`posts-feed:${clientIp(request)}`, 60, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { searchParams } = new URL(request.url);
  try {
    const me = await getCurrentUser();
    const connectionIds = me ? await getConnectionUserIds(me.id) : [];

    const result = await getPostsFeed({
      sort: searchParams.get("sort") || "new",
      cursor: searchParams.get("cursor"),
      postType: searchParams.get("type"),
      viewerId: me?.id ?? null,
      connectionIds,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/posts GET]", err);
    return NextResponse.json({ error: "Couldn't load the feed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const dbUser = await getCurrentUser();

  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (dbUser.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  // Throttle bursts per account before touching the DB at all.
  if (!(await rateLimit(`post-create:${dbUser.id}`, 10, 60_000))) {
    return NextResponse.json(
      { error: "You're posting too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json();
  const { title: rawTitle, body: rawBody, postType, tagIds: rawTagIds, drinkIds: rawDrinkIds, imageUrl, visibility } = body;
  const title = typeof rawTitle === "string" ? rawTitle.slice(0, 300) : rawTitle;
  const postBody = typeof rawBody === "string" ? rawBody.slice(0, 10000) : rawBody;
  const tagIds = Array.isArray(rawTagIds) ? rawTagIds.slice(0, 10) : rawTagIds;
  const drinkIds = Array.isArray(rawDrinkIds) ? rawDrinkIds.slice(0, 10) : rawDrinkIds;

  const VALID_POST_TYPES = new Set(["STORY", "QUESTION", "REVIEW", "RECOMMENDATION", "MEME"]);

  if (!title || !postType) {
    return NextResponse.json(
      { error: "Title and post type are required" },
      { status: 400 }
    );
  }

  if (!VALID_POST_TYPES.has(postType)) {
    return NextResponse.json({ error: "Invalid post type" }, { status: 400 });
  }

  // Audience: PUBLIC (default, global feed) or CIRCLE (only the author + their
  // connections). Anything else falls back to PUBLIC.
  const postVisibility: PostVisibility =
    visibility === "CIRCLE" ? "CIRCLE" : "PUBLIC";

  // Only accept image URLs we host on OUR Supabase Storage public bucket.
  // Parse structurally (host + path) — never a substring regex, which would
  // accept https://evil.com/?x=.supabase.co/storage/ and turn every viewer's
  // browser into a beacon for an attacker-controlled URL.
  const safeImageUrl = sanitizeImageUrl(imageUrl);

  try {
    // Hard ceiling on stored posts per account — caps unbounded row spam even
    // if the rate limiter is bypassed across instances.
    const postCount = await prisma.post.count({ where: { authorId: dbUser.id } });
    if (postCount >= 500) {
      return NextResponse.json(
        { error: "You've reached the 500-post limit." },
        { status: 409 },
      );
    }

    // Intersect supplied relation ids against what actually exists — unknown ids
    // would otherwise hit a nested-create FK violation (500) or persist a
    // phantom relation. Drop anything that doesn't resolve to a real row.
    const wantTagIds: string[] = Array.isArray(tagIds)
      ? tagIds.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const wantDrinkIds: string[] = Array.isArray(drinkIds)
      ? drinkIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    const [existingTags, existingDrinks] = await Promise.all([
      wantTagIds.length
        ? prisma.tag.findMany({ where: { id: { in: wantTagIds } }, select: { id: true } })
        : Promise.resolve([]),
      wantDrinkIds.length
        ? prisma.drink.findMany({ where: { id: { in: wantDrinkIds } }, select: { id: true } })
        : Promise.resolve([]),
    ]);

    const validTagIds = existingTags.map((t) => t.id);
    const validDrinkIds = existingDrinks.map((d) => d.id);

    const post = await prisma.post.create({
      data: {
        authorId: dbUser.id,
        title,
        body: postBody || null,
        postType: postType as PostType,
        visibility: postVisibility,
        imageUrl: safeImageUrl,
        tags: validTagIds.length
          ? { create: validTagIds.map((id: string) => ({ tagId: id })) }
          : undefined,
        drinks: validDrinkIds.length
          ? { create: validDrinkIds.map((id: string) => ({ drinkId: id })) }
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

    // Independent post-create side effects — run concurrently.
    await Promise.all([
      persistMentions({
        mentionerId: dbUser.id,
        body: `${title} ${postBody ?? ""}`,
        postId: post.id,
        notifyType: "TAG",
      }),
      // New post on a private (circle-only) feed → notify the author's circle —
      // i.e. the people they're connected to via referral.
      post.visibility === PostVisibility.CIRCLE
        ? getConnectionUserIds(dbUser.id).then((ids) =>
            notifyMany(ids, { type: "CIRCLE_POST", postId: post.id, actorId: dbUser.id }),
          )
        : Promise.resolve(),
    ]);
    after(() => recomputeKarma(dbUser.id));

    logInteraction({
      userId: dbUser.id,
      interactionType: "CREATE_POST",
      targetType: "POST",
      targetId: post.id,
      context: { visibility: post.visibility },
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/posts] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/posts]", err);
    return NextResponse.json({ error: "Couldn't save your post." }, { status: 500 });
  }
}
