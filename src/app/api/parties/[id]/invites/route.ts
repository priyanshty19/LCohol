import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { notifyMany } from "@/lib/notifications";
import { generateUniqueReferralCode, referralExpiry } from "@/lib/referrals";

// POST /api/parties/[id]/invites
//   { userIds?: string[] }   → invite circle members (notify each)
//   { generateLink?: true }  → mint a shareable invite link (doubles as a referral)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const party = await prisma.partyPlan.findUnique({
    where: { id },
    select: { id: true, authorId: true, startsAt: true },
  });
  if (!party || party.authorId !== me.id) {
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
