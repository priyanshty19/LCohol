import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Soft-delete a post or comment. Moderators+ only. Every action is audited.
export async function POST(request: NextRequest) {
  const guard = await requireRole("MODERATOR");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`mod-delete:${guard.user.id}`, 30, 60000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

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
        reason: typeof reason === "string" ? reason.slice(0, 500) : reason ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[moderation/delete]", err);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
}
