import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canModerate } from "@/lib/rbac";
import { recomputeKarma } from "@/lib/karma";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Soft-delete a post or comment. Moderators+ only. Every action is audited.
export async function POST(request: NextRequest) {
  const guard = await requireRole("MODERATOR");
  if (!guard.ok) return guard.response;

  if (!(await rateLimit(`mod-delete:${guard.user.id}`, 30, 60000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { type, id, reason } = await request.json();
    const remark = typeof reason === "string" ? reason.trim().slice(0, 500) : "";
    if ((type !== "post" && type !== "comment") || !id) {
      return NextResponse.json({ error: "type ('post'|'comment') and id are required." }, { status: 400 });
    }
    if (!remark) {
      return NextResponse.json({ error: "Moderator remark is required." }, { status: 400 });
    }

    const target =
      type === "post"
        ? await prisma.post.findUnique({ where: { id }, select: { authorId: true, author: { select: { role: true } } } })
        : await prisma.comment.findUnique({ where: { id }, select: { authorId: true, author: { select: { role: true } } } });
    if (!target) {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    if (!canModerate(guard.user.role, target.author.role)) {
      return NextResponse.json({ error: "You don't have permission to moderate this content." }, { status: 403 });
    }

    if (type === "post") {
      await prisma.post.update({ where: { id }, data: { isDeleted: true } });
    } else {
      await prisma.comment.update({ where: { id }, data: { isDeleted: true } });
    }

    after(() => recomputeKarma(target.authorId));

    await prisma.moderationAction.create({
      data: {
        actorId: guard.user.id,
        action: type === "post" ? "DELETE_POST" : "DELETE_COMMENT",
        targetType: type === "post" ? "POST" : "COMMENT",
        targetId: id,
        reason: remark,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Content not found." }, { status: 404 });
    }
    console.error("[moderation/delete]", err);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
