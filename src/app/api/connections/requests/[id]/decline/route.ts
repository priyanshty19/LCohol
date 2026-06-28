import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// POST /api/connections/requests/[id]/decline — recipient declines a pending
// request (or sender cancels their own outgoing one).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;
  const me = guard.user.id;

  if (!rateLimit(`conn-decline:${me}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { id } = await params;

  try {
    const req = await prisma.connectionRequest.findUnique({
      where: { id },
      select: { id: true, fromUserId: true, toUserId: true, status: true },
    });
    if (!req || (req.toUserId !== me && req.fromUserId !== me)) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    if (req.status !== "PENDING") {
      return NextResponse.json({ error: "This request was already handled." }, { status: 409 });
    }

    await prisma.connectionRequest.update({
      where: { id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });

    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/connections/requests decline]", err);
    return NextResponse.json({ error: "Couldn't update request." }, { status: 500 });
  }
}
