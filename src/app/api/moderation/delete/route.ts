import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

// Soft-delete a post or comment. Moderators+ only. Every action is audited.
export async function POST(request: NextRequest) {
  const guard = await requireRole("MODERATOR");
  if (!guard.ok) return guard.response;

  try {
    const { type, id, reason } = await request.json();
    if ((type !== "post" && type !== "comment") || !id) {
      return NextResponse.json({ error: "type ('post'|'comment') and id are required." }, { status: 400 });
    }

    if (type === "post") {
      await prisma.post.update({ where: { id }, data: { isDeleted: true } });
    } else {
      await prisma.comment.update({ where: { id }, data: { isDeleted: true } });
    }

    await prisma.moderationAction.create({
      data: {
        actorId: guard.user.id,
        action: type === "post" ? "DELETE_POST" : "DELETE_COMMENT",
        targetType: type === "post" ? "POST" : "COMMENT",
        targetId: id,
        reason: reason ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[moderation/delete]", err);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
