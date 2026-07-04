import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartyDetail } from "@/lib/parties";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const party = await getPartyDetail(id);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

  // Only the host or an invited guest can see the party.
  const isHost = party.authorId === me.id;
  const isGuest = party.invites.some((i) => i.invitedUserId === me.id);
  if (!isHost && !isGuest) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { ...party, isHost } });
}

// PATCH /api/parties/[id] → host cancels the party.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!(await rateLimit(`party-patch:${me.id}`, 10, 60_000))) {
    return NextResponse.json(
      { error: "You're doing that too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const party = await prisma.partyPlan.findUnique({ where: { id }, select: { authorId: true } });
    if (!party || party.authorId !== me.id) {
      return NextResponse.json({ error: "Party not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.action === "cancel") {
      await prisma.partyPlan.update({ where: { id }, data: { status: "CANCELLED" } });
      return NextResponse.json({ data: { ok: true } });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/parties/[id]] PATCH", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
