import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

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
      { status: 429 }
    );
  }

  const body = await request.json();
  const { postId, commentId, reason, details } = body;

  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  // Exactly one target — not both, not neither.
  if (!postId === !commentId) {
    return NextResponse.json(
      { error: "Report exactly one post or comment" },
      { status: 400 }
    );
  }

  const report = await prisma.report.create({
    data: {
      reporterId: dbUser.id,
      postId: postId || null,
      commentId: commentId || null,
      reason,
      details: details || null,
    },
  });

  return NextResponse.json({ data: { id: report.id } }, { status: 201 });
}
