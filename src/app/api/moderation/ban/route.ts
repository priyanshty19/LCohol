import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { canModerate } from "@/lib/rbac";

// Ban or unban a user. Moderators+ only; mods cannot touch admins/other mods.
export async function POST(request: NextRequest) {
  const guard = await requireRole("MODERATOR");
  if (!guard.ok) return guard.response;

  try {
    const { userId, ban, reason } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }
    if (userId === guard.user.id) {
      return NextResponse.json({ error: "You cannot ban yourself." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (!canModerate(guard.user.role, target.role)) {
      return NextResponse.json({ error: "You don't have permission to moderate this user." }, { status: 403 });
    }

    const shouldBan = ban !== false;
    await prisma.user.update({ where: { id: userId }, data: { isBanned: shouldBan } });

    await prisma.moderationAction.create({
      data: {
        actorId: guard.user.id,
        action: shouldBan ? "BAN_USER" : "UNBAN_USER",
        targetType: "PROFILE",
        targetId: userId,
        reason: reason ?? null,
      },
    });

    return NextResponse.json({ ok: true, isBanned: shouldBan });
  } catch (err) {
    console.error("[moderation/ban]", err);
    return NextResponse.json({ error: "Could not update ban status." }, { status: 500 });
  }
}
