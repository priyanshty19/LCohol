import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createConnectionTx } from "@/lib/connections";
import { recomputeKarma } from "@/lib/karma";
import { notify } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// POST /api/party/[code]/accept — a signed-in guest accepts a link invite:
// connect to the host's circle (if needed) and RSVP GOING.
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!rateLimit(`party-accept:${me.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const invite = await prisma.partyInvite.findUnique({
      where: { code },
      select: { partyPlanId: true, expiresAt: true, partyPlan: { select: { authorId: true, status: true } } },
    });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "This invite has expired." }, { status: 410 });
    }
    if (invite.partyPlan.status === "CANCELLED") {
      return NextResponse.json({ error: "This party was cancelled." }, { status: 410 });
    }

    const hostId = invite.partyPlan.authorId;
    const partyId = invite.partyPlanId;
    if (hostId === me.id) return NextResponse.json({ data: { partyId } });

    await prisma.$transaction(async (tx) => {
      await createConnectionTx(tx, hostId, me.id);
      await tx.partyInvite.upsert({
        where: { partyPlanId_invitedUserId: { partyPlanId: partyId, invitedUserId: me.id } },
        create: { partyPlanId: partyId, inviterId: hostId, invitedUserId: me.id, rsvp: "GOING", respondedAt: new Date() },
        update: { rsvp: "GOING", respondedAt: new Date() },
      });
    });

    await Promise.all([recomputeKarma(hostId), recomputeKarma(me.id)]);
    await notify({ userId: hostId, actorId: me.id, type: "RSVP", partyId });

    return NextResponse.json({ data: { partyId } });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/party/[code]/accept]", err);
    return NextResponse.json({ error: "Couldn't accept invite." }, { status: 500 });
  }
}
