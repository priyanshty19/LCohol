import { NextResponse, after } from "next/server";
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

  if (!(await rateLimit(`vote:${dbUser.id}`, 30, 60_000))) {
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

    // Atomic vote toggle, then recompute post.score from SUM(votes.value) — the
    // source of truth — inside the same transaction. Delta-based increments drift
    // under concurrent clicks (double-decrement / P2002); recomputing from the
    // aggregate keeps score == SUM(votes) no matter how requests interleave.
    let voteState: number | null;
    try {
      voteState = await prisma.$transaction(async (tx) => {
        const existing = await tx.vote.findUnique({
          where: { userId_postId: { userId: dbUser.id, postId } },
        });
        let state: number | null;
        if (!existing) {
          await tx.vote.create({ data: { userId: dbUser.id, postId, value } });
          state = value;
        } else if (existing.value === value) {
          await tx.vote.delete({ where: { id: existing.id } });
          state = null;
        } else {
          await tx.vote.update({ where: { id: existing.id }, data: { value } });
          state = value;
        }
        const agg = await tx.vote.aggregate({ where: { postId }, _sum: { value: true } });
        await tx.post.update({ where: { id: postId }, data: { score: agg._sum.value ?? 0 } });
        return state;
      });
    } catch (txErr) {
      // A concurrent vote raced us (P2002 unique create / P2025 vanished row).
      // The other request already left a consistent state — return the current
      // vote idempotently instead of a 500.
      const code = (txErr as { code?: string }).code;
      if (code === "P2002" || code === "P2025") {
        const current = await prisma.vote.findUnique({
          where: { userId_postId: { userId: dbUser.id, postId } },
        });
        return NextResponse.json({ data: { vote: current?.value ?? null } });
      }
      throw txErr;
    }

    // Karma is a derived, eventually-consistent metric — don't make the voter
    // wait on 4 COUNT queries + an UPDATE before seeing their vote register.
    after(() => recomputeKarma(dbUser.id));
    return NextResponse.json(
      { data: { vote: voteState } },
      { status: voteState === null ? 200 : 201 },
    );
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/posts/[id]/vote] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/posts/[id]/vote]", err);
    return NextResponse.json({ error: "Couldn't record your vote." }, { status: 500 });
  }
}
