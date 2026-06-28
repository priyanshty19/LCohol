import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { recomputeKarma } from "@/lib/karma";
import { logInteraction } from "@/lib/interactions";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

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

  if (!rateLimit(`vote:${dbUser.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "You're voting too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { value } = await request.json();

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  try {
    // Don't mutate score on a post the caller can't see — blocks score
    // manipulation on hidden posts and an existence oracle for soft-deleted ids.
    const post = await prisma.post.findFirst({
      where: { id: postId, isDeleted: false },
      select: { authorId: true, visibility: true },
    });
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (post.visibility === "CIRCLE") {
      const allowed =
        dbUser.id === post.authorId ||
        (await getConnectionUserIds(dbUser.id)).includes(post.authorId);
      if (!allowed) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    logInteraction({
      userId: dbUser.id,
      interactionType: value === 1 ? "UPVOTE" : "DOWNVOTE",
      targetType: "POST",
      targetId: postId,
    });

    const existing = await prisma.vote.findUnique({
      where: { userId_postId: { userId: dbUser.id, postId } },
    });

    if (existing) {
      if (existing.value === value) {
        await prisma.$transaction([
          prisma.vote.delete({ where: { id: existing.id } }),
          prisma.post.update({
            where: { id: postId },
            data: { score: { decrement: value } },
          }),
        ]);
        await recomputeKarma(dbUser.id);
        return NextResponse.json({ data: { vote: null } });
      } else {
        await prisma.$transaction([
          prisma.vote.update({ where: { id: existing.id }, data: { value } }),
          prisma.post.update({
            where: { id: postId },
            data: { score: { increment: value * 2 } },
          }),
        ]);
        await recomputeKarma(dbUser.id);
        return NextResponse.json({ data: { vote: value } });
      }
    }

    await prisma.$transaction([
      prisma.vote.create({
        data: { userId: dbUser.id, postId, value },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { score: { increment: value } },
      }),
    ]);

    await recomputeKarma(dbUser.id);
    return NextResponse.json({ data: { vote: value } }, { status: 201 });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/posts/[id]/vote] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/posts/[id]/vote]", err);
    return NextResponse.json({ error: "Couldn't record your vote." }, { status: 500 });
  }
}
