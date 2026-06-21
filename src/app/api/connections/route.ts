import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";

// GET /api/connections — my circle: the other user in each connection.
export async function GET() {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  const me = guard.user.id;
  const profileSelect = {
    select: {
      profile: {
        select: { username: true, displayName: true, avatarUrl: true },
      },
    },
  } as const;

  try {
    const rows = await prisma.connection.findMany({
      where: { OR: [{ userAId: me }, { userBId: me }] },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        userAId: true,
        userA: profileSelect,
        userB: profileSelect,
      },
    });

    const data = rows.map((r) => {
      const other = r.userAId === me ? r.userB : r.userA;
      return {
        id: r.id,
        since: r.createdAt,
        username: other.profile?.username ?? null,
        displayName: other.profile?.displayName ?? null,
        avatarUrl: other.profile?.avatarUrl ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/connections GET]", err);
    return NextResponse.json(
      { error: "Couldn't load your circle." },
      { status: 500 },
    );
  }
}
