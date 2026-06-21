import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { areConnected } from "@/lib/connections";

const withProfile = {
  select: { profile: { select: { username: true, displayName: true, avatarUrl: true } } },
} as const;

// GET /api/connections/requests — my pending requests, incoming and outgoing.
export async function GET() {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;
  const me = guard.user.id;

  try {
    const [incoming, outgoing] = await Promise.all([
      prisma.connectionRequest.findMany({
        where: { toUserId: me, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, from: withProfile },
      }),
      prisma.connectionRequest.findMany({
        where: { fromUserId: me, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true, to: withProfile },
      }),
    ]);

    const shape = (p: { profile: { username: string | null; displayName: string | null; avatarUrl: string | null } | null }) => ({
      username: p.profile?.username ?? null,
      displayName: p.profile?.displayName ?? null,
      avatarUrl: p.profile?.avatarUrl ?? null,
    });

    return NextResponse.json({
      data: {
        incoming: incoming.map((r) => ({ id: r.id, createdAt: r.createdAt, user: shape(r.from) })),
        outgoing: outgoing.map((r) => ({ id: r.id, createdAt: r.createdAt, user: shape(r.to) })),
      },
    });
  } catch (err) {
    console.error("[api/connections/requests GET]", err);
    return NextResponse.json({ error: "Couldn't load requests." }, { status: 500 });
  }
}

// POST /api/connections/requests { username } — ask to connect with a member.
export async function POST(request: NextRequest) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;

  if (!rateLimit(`conn-request:${clientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const username = (body.username ?? "").trim();
  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const me = guard.user.id;

  try {
    const target = await prisma.profile.findUnique({
      where: { username },
      select: { userId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "No member with that name." }, { status: 404 });
    }
    if (target.userId === me) {
      return NextResponse.json({ error: "You can't add yourself." }, { status: 400 });
    }
    if (await areConnected(me, target.userId)) {
      return NextResponse.json({ error: "You're already connected." }, { status: 409 });
    }

    // A pending request in EITHER direction blocks a new one.
    const existing = await prisma.connectionRequest.findFirst({
      where: {
        status: "PENDING",
        OR: [
          { fromUserId: me, toUserId: target.userId },
          { fromUserId: target.userId, toUserId: me },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "There's already a pending request." }, { status: 409 });
    }

    await prisma.connectionRequest.create({
      data: { fromUserId: me, toUserId: target.userId },
    });

    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  } catch (err) {
    console.error("[api/connections/requests POST]", err);
    return NextResponse.json({ error: "Couldn't send request." }, { status: 500 });
  }
}
