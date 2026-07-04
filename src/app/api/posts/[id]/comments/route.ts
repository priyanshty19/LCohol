import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { COMMENTS_PAGE_SIZE } from "@/lib/constants";
import { persistMentions } from "@/lib/mentions";
import { recomputeKarma } from "@/lib/karma";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

const COMMENT_LIMIT_PER_MIN = 10;
const MAX_COMMENTS_PER_POST = 100;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  // A CIRCLE post's comments are as private as the post. Gate the read the same
  // way the post route does and 404 (not 403) so existence doesn't leak — the
  // edge middleware lets all /api/* through unauthenticated.
  const post = await prisma.post.findUnique({
    where: { id: postId, isDeleted: false },
    select: { authorId: true, visibility: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (post.visibility === "CIRCLE") {
    const me = await getCurrentUser();
    const allowed =
      !!me &&
      (me.id === post.authorId ||
        (await getConnectionUserIds(me.id)).includes(post.authorId));
    if (!allowed) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null, isDeleted: false },
    orderBy: { score: "desc" },
    take: COMMENTS_PAGE_SIZE,
    include: {
      author: {
        select: {
          profile: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      replies: {
        where: { isDeleted: false },
        orderBy: { score: "desc" },
        take: 5,
        include: {
          author: {
            select: {
              profile: {
                select: { username: true, displayName: true, avatarUrl: true },
              },
            },
          },
          _count: { select: { replies: true } },
        },
      },
      _count: { select: { replies: true } },
    },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const dbUser = await getCurrentUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (dbUser.isBanned) {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }

  if (!(await rateLimit(`comment-create:${dbUser.id}`, COMMENT_LIMIT_PER_MIN, 60_000))) {
    return NextResponse.json(
      { error: "You're commenting too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const post = await prisma.post.findUnique({ where: { id: postId, isDeleted: false }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const raw = await request.json().catch(() => ({}));
  const body = typeof raw.body === "string" ? raw.body.slice(0, 4000) : "";
  const parentId = typeof raw.parentId === "string" ? raw.parentId : null;

  if (!body || body.trim().length === 0) {
    return NextResponse.json(
      { error: "Comment body is required" },
      { status: 400 }
    );
  }

  try {
    const myCount = await prisma.comment.count({
      where: { postId, authorId: dbUser.id },
    });
    if (myCount >= MAX_COMMENTS_PER_POST) {
      return NextResponse.json(
        { error: `You've reached the ${MAX_COMMENTS_PER_POST}-comment limit on this post.` },
        { status: 409 },
      );
    }

    // A reply must point at a real, undeleted comment ON THIS POST — else a reply
    // can be smuggled onto another post's thread, or a junk id 500s.
    if (parentId) {
      const parent = await prisma.comment.findFirst({
        where: { id: parentId, postId, isDeleted: false },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 404 });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: dbUser.id,
        body: body.trim(),
        parentId: parentId || null,
      },
      include: {
        author: {
          select: {
            profile: {
              select: { username: true, displayName: true, avatarUrl: true },
            },
          },
        },
        _count: { select: { replies: true } },
      },
    });

    await persistMentions({
      mentionerId: dbUser.id,
      body: comment.body,
      commentId: comment.id,
      postId,
      notifyType: "MENTION",
    });
    after(() => recomputeKarma(dbUser.id));

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/posts/[id]/comments] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/posts/[id]/comments]", err);
    return NextResponse.json({ error: "Couldn't post your comment." }, { status: 500 });
  }
}
