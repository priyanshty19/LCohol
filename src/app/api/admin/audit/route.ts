import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

// Immutable moderation/admin audit log. Admins only.
export async function GET() {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;

  const actions = await prisma.moderationAction.findMany({
    include: {
      actor: { select: { email: true, profile: { select: { username: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: actions });
}
