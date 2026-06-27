import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { logInteraction } from "@/lib/interactions";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

const VALID = new Set(["GOING", "MAYBE", "DECLINED"]);

// PATCH /api/parties/[id]/rsvp → an invited guest sets their RSVP.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!rateLimit(`rsvp:${me.id}`, 12, 60_000)) {
    return NextResponse.json(
      { error: "Too many RSVPs. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  if (!VALID.has(body.status)) {
    return NextResponse.json({ error: "Invalid RSVP." }, { status: 400 });
  }

  try {
    const party = await prisma.partyPlan.findUnique({ where: { id }, select: { authorId: true } });
    if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });
    if (party.authorId === me.id) {
      return NextResponse.json({ error: "As host, you're already in." }, { status: 400 });
    }

    const invite = await prisma.partyInvite.findFirst({
      where: { partyPlanId: id, invitedUserId: me.id },
      select: { id: true },
    });
    if (!invite) {
      return NextResponse.json({ error: "You're not invited to this party." }, { status: 404 });
    }

    await prisma.partyInvite.update({
      where: { id: invite.id },
      data: { rsvp: body.status, respondedAt: new Date() },
    });

    await notify({ userId: party.authorId, actorId: me.id, type: "RSVP", partyId: id });

    logInteraction({
      userId: me.id,
      interactionType: "RSVP",
      targetType: "PARTY",
      targetId: id,
      context: { status: body.status },
    });

    return NextResponse.json({ data: { rsvp: body.status } });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/parties/[id]/rsvp]", err);
    return NextResponse.json({ error: "Couldn't save your RSVP." }, { status: 500 });
  }
}
