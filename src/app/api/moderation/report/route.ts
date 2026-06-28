import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

export async function POST(request: Request) {
  const dbUser = await getCurrentUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Match sibling mutation routes: banned users cannot act, and cap report
  // volume so the moderation queue can't be flooded.
  if (dbUser.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }
  if (!rateLimit(`report:${dbUser.id}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "You're reporting too fast — give it a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await request.json();
  const { postId, commentId, reason, details } = body;

  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  // `reason` is a ReportReason enum (Prisma validates it at write); only the
  // free-text `details` needs a length cap.
  const cappedDetails = details ? String(details).slice(0, 2000) : null;

  // Exactly one target — not both, not neither.
  if (!postId === !commentId) {
    return NextResponse.json(
      { error: "Report exactly one post or comment" },
      { status: 400 }
    );
  }

  try {
    // Hard ceiling per account so the moderation queue can't be row-spammed
    // even if the rate limiter is bypassed across instances.
    const reportCount = await prisma.report.count({
      where: { reporterId: dbUser.id },
    });
    if (reportCount >= 200) {
      return NextResponse.json(
        { error: "You've filed too many reports. Please contact support." },
        { status: 409 }
      );
    }

    const report = await prisma.report.create({
      data: {
        reporterId: dbUser.id,
        postId: postId || null,
        commentId: commentId || null,
        reason,
        details: cappedDetails,
      },
    });

    return NextResponse.json({ data: { id: report.id } }, { status: 201 });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/moderation/report] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/moderation/report]", err);
    return NextResponse.json({ error: "Couldn't file your report." }, { status: 500 });
  }
}
