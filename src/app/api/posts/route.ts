import { NextResponse } from "next/server";
import { PostType, PostVisibility } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { getPostsFeed } from "@/lib/posts";
import { recomputeKarma } from "@/lib/karma";
import { persistMentions } from "@/lib/mentions";
import { notifyMany } from "@/lib/notifications";
import { logInteraction } from "@/lib/interactions";

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
  const { title, body: postBody, postType, tagIds, drinkIds, imageUrl, visibility } = body;

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

  const post = await prisma.post.create({
    data: {
      authorId: dbUser.id,
      title,
      body: postBody || null,
      postType: postType as PostType,
      visibility: postVisibility,
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

  // Independent post-create side effects — run concurrently.
  await Promise.all([
    persistMentions({
      mentionerId: dbUser.id,
      body: `${title} ${postBody ?? ""}`,
      postId: post.id,
      notifyType: "TAG",
    }),
    recomputeKarma(dbUser.id),
    // New post on a private (circle-only) feed → notify the author's circle —
    // i.e. the people they're connected to via referral.
    post.visibility === PostVisibility.CIRCLE
      ? getConnectionUserIds(dbUser.id).then((ids) =>
          notifyMany(ids, { type: "CIRCLE_POST", postId: post.id, actorId: dbUser.id }),
        )
      : Promise.resolve(),
  ]);

  logInteraction({
    userId: dbUser.id,
    interactionType: "CREATE_POST",
    targetType: "POST",
    targetId: post.id,
    context: { visibility: post.visibility },
  });

  return NextResponse.json({ data: post }, { status: 201 });
}
