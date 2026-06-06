import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const dbUser = await getCurrentUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { postId, commentId, reason, details } = body;

  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  if (!postId && !commentId) {
    return NextResponse.json(
      { error: "Must report a post or comment" },
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
