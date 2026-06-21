import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getConnectionUserIds } from "@/lib/connections";

// GET /api/users/search?q= — find members by pseudonym to add to your circle.
// Each result carries a relationship hint so the UI can show Add / Pending /
// Connected without extra round-trips.
export async function GET(request: NextRequest) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`user-search:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ data: [] }, { status: 429 });
  }

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ data: [] });

  const me = guard.user.id;

  try {
    const matches = await prisma.profile.findMany({
      where: {
        userId: { not: me },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { userId: true, username: true, displayName: true, avatarUrl: true },
    });

    const matchIds = matches.map((m) => m.userId);
    const connected = new Set(await getConnectionUserIds(me));
    const pendingRows = await prisma.connectionRequest.findMany({
      where: {
        status: "PENDING",
        OR: [
          { fromUserId: me, toUserId: { in: matchIds } },
          { toUserId: me, fromUserId: { in: matchIds } },
        ],
      },
      select: { fromUserId: true, toUserId: true },
    });
    const pending = new Set(
      pendingRows.map((r) => (r.fromUserId === me ? r.toUserId : r.fromUserId)),
    );

    const data = matches.map((m) => ({
      username: m.username,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      relationship: connected.has(m.userId)
        ? "connected"
        : pending.has(m.userId)
          ? "pending"
          : "none",
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[api/users/search]", err);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
