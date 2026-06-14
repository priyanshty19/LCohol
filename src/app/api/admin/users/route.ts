import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

// User directory for admin management. Admins only.
export async function GET(request: NextRequest) {
  const guard = await requireRole("ADMIN");
  if (!guard.ok) return guard.response;

  const q = new URL(request.url).searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { profile: { username: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {},
    select: {
      id: true,
      email: true,
      role: true,
      isBanned: true,
      createdAt: true,
      profile: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: users });
}
