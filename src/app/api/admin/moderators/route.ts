import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Promote a user to MODERATOR or demote back to USER. Admins only.
export async function POST(request: NextRequest) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`admin-mod:${guard.user.id}`, 20, 60000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const { userId, makeMod } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (target.role === "ADMIN") {
      return NextResponse.json({ error: "Admins cannot be demoted here." }, { status: 403 });
    }

    const newRole = makeMod ? "MODERATOR" : "USER";
    await prisma.user.update({ where: { id: userId }, data: { role: newRole } });

    await prisma.moderationAction.create({
      data: {
        actorId: guard.user.id,
        action: makeMod ? "PROMOTE_MOD" : "DEMOTE_MOD",
        targetType: "PROFILE",
        targetId: userId,
      },
    });

    return NextResponse.json({ ok: true, role: newRole });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[admin/moderators]", err);
    return NextResponse.json({ error: "Could not update role." }, { status: 500 });
  }
}
