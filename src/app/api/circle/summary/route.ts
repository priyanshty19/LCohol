import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-guard";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import {
  REFERRAL_MAX_ACTIVE,
  countActiveReferrals,
  expireStaleReferrals,
} from "@/lib/referrals";

// One round-trip that bundles everything the Circle view polls: invites,
// connections, and pending requests. Replaces the 3 separate fetches that
// circle-view.tsx fired on every 12s tick (/api/referrals, /api/connections,
// /api/connections/requests). Collapsing them into a single GET means one DB
// session-pool grab per poll instead of three — the live EMAXCONNSESSION fix.
// Response shape is flat under `data` so the view sets all sections at once.
const referralSelect = {
  id: true,
  code: true,
  label: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  acceptedBy: { select: { profile: { select: { username: true } } } },
} as const;

const withProfile = {
  select: {
    profile: { select: { username: true, displayName: true, avatarUrl: true } },
  },
} as const;

export async function GET() {
  const guard = await requireRole("USER");
  if (!guard.ok) return guard.response;
  const me = guard.user.id;

  try {
    // Expire stale invites first (a write), then read every section in parallel.
    await expireStaleReferrals(me);

    const [referrals, activeCount, connectionRows, incoming, outgoing] =
      await Promise.all([
        prisma.referral.findMany({
          where: { inviterId: me },
          orderBy: { createdAt: "desc" },
          select: referralSelect,
        }),
        countActiveReferrals(me),
        prisma.connection.findMany({
          where: { OR: [{ userAId: me }, { userBId: me }] },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            userAId: true,
            userBId: true,
            userA: withProfile,
            userB: withProfile,
          },
        }),
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

    const connections = connectionRows.map((r) => {
      const other = r.userAId === me ? r.userB : r.userA;
      return {
        id: r.id, // connection row id (kept for the existing circle UI)
        userId: r.userAId === me ? r.userBId : r.userAId,
        since: r.createdAt,
        username: other.profile?.username ?? null,
        displayName: other.profile?.displayName ?? null,
        avatarUrl: other.profile?.avatarUrl ?? null,
      };
    });

    const shape = (p: {
      profile: {
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
      } | null;
    }) => ({
      username: p.profile?.username ?? null,
      displayName: p.profile?.displayName ?? null,
      avatarUrl: p.profile?.avatarUrl ?? null,
    });

    return NextResponse.json({
      data: {
        referrals,
        activeCount,
        maxActive: REFERRAL_MAX_ACTIVE,
        connections,
        requests: {
          incoming: incoming.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            user: shape(r.from),
          })),
          outgoing: outgoing.map((r) => ({
            id: r.id,
            createdAt: r.createdAt,
            user: shape(r.to),
          })),
        },
      },
    });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/circle/summary GET] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/circle/summary GET]", err);
    return NextResponse.json(
      { error: "Couldn't load your circle." },
      { status: 500 },
    );
  }
}
