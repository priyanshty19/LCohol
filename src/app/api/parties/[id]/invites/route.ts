import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { notifyMany } from "@/lib/notifications";
import { generateUniqueReferralCode, referralExpiry } from "@/lib/referrals";
import { requireHost } from "@/lib/parties";

// POST /api/parties/[id]/invites
//   { userIds?: string[] }   → invite circle members (notify each)
//   { generateLink?: true }  → mint a shareable invite link (doubles as a referral)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const party = await requireHost(id, me.id);
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const result: { invited: number; code: string | null } = { invited: 0, code: null };

  // Invite specific circle members.
  const requested: string[] = Array.isArray(body.userIds)
    ? body.userIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (requested.length) {
    const circle = new Set(await getConnectionUserIds(me.id));
    const valid = requested.filter((uid) => circle.has(uid));
    if (valid.length) {
      const existing = await prisma.partyInvite.findMany({
        where: { partyPlanId: id, invitedUserId: { in: valid } },
        select: { invitedUserId: true },
      });
      const have = new Set(existing.map((e) => e.invitedUserId));
      const fresh = valid.filter((uid) => !have.has(uid));
      if (fresh.length) {
        await prisma.partyInvite.createMany({
          data: fresh.map((invitedUserId) => ({ partyPlanId: id, inviterId: me.id, invitedUserId })),
        });
        await notifyMany(fresh, { actorId: me.id, type: "PARTY_INVITE", partyId: id });
        result.invited = fresh.length;
      }
    }
  }

  // Mint a shareable link. The code is a real Referral too, so a non-member who
  // opens it can sign up + join the host's circle (and gets RSVP'd on signup).
  if (body.generateLink) {
    const code = await generateUniqueReferralCode();
    const expires = party.startsAt && party.startsAt > new Date() ? party.startsAt : referralExpiry();
    // Atomic: the referral and its party-invite must both exist or neither —
    // otherwise a code is redeemable at signup but never RSVPs to the party.
    await prisma.$transaction([
      prisma.referral.create({
        data: { code, inviterId: me.id, label: "Party invite", expiresAt: expires },
      }),
      prisma.partyInvite.create({
        data: { partyPlanId: id, inviterId: me.id, code, expiresAt: expires },
      }),
    ]);
    result.code = code;
  }

  return NextResponse.json({ data: result });
}

// DELETE /api/parties/[id]/invites  { inviteId }
//   Host revokes an invitee (any rsvp state) or a shareable link invite.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const party = await requireHost(id, me.id);
  if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const inviteId = typeof body.inviteId === "string" ? body.inviteId : null;
  if (!inviteId) return NextResponse.json({ error: "inviteId required" }, { status: 400 });

  // Scope the lookup to this party so a host can't delete another party's invite.
  const invite = await prisma.partyInvite.findFirst({
    where: { id: inviteId, partyPlanId: id },
    select: { id: true, code: true },
  });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  // A link invite's `code` is also a Referral row (created together in POST), so
  // revoke must remove both — otherwise the code stays redeemable at signup.
  if (invite.code) {
    await prisma.$transaction([
      prisma.partyInvite.delete({ where: { id: invite.id } }),
      prisma.referral.deleteMany({ where: { code: invite.code } }),
    ]);
  } else {
    await prisma.partyInvite.delete({ where: { id: invite.id } });
  }

  return NextResponse.json({ data: { revoked: invite.id } });
}
