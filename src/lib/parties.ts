import { prisma } from "@/lib/prisma";

// Lean selects — no Prisma Decimal/relation that RSC can't serialize.
const authorSelect = {
  select: { id: true, profile: { select: { username: true, displayName: true } } },
} as const;
const barSelect = {
  select: { id: true, name: true, slug: true, city: true },
} as const;
const inviteSelect = {
  select: {
    id: true,
    rsvp: true,
    invitedUserId: true,
    invitedUser: { select: { profile: { select: { username: true, displayName: true } } } },
  },
} as const;

const summaryInclude = {
  author: authorSelect,
  bar: barSelect,
  _count: { select: { invites: true } },
} as const;

export async function getPartiesFor(userId: string) {
  const liveCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const [hosting, invited, open] = await Promise.all([
    prisma.partyPlan.findMany({
      where: { authorId: userId },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: summaryInclude,
    }),
    prisma.partyPlan.findMany({
      where: { invites: { some: { invitedUserId: userId } } },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      include: {
        ...summaryInclude,
        invites: { where: { invitedUserId: userId }, select: { rsvp: true } },
      },
    }),
    prisma.partyPlan.findMany({
      where: {
        visibility: "PUBLIC",
        status: "UPCOMING",
        authorId: { not: userId },
        OR: [{ startsAt: null }, { startsAt: { gte: liveCutoff } }],
      },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        ...summaryInclude,
        invites: { where: { invitedUserId: userId }, select: { rsvp: true } },
      },
    }),
  ]);
  return { hosting, invited, open };
}

// Centralized host-ownership guard for party mutations. Returns the party (with
// fields mutation routes commonly need) when `userId` is the host, else null.
// Use this instead of re-implementing `party.authorId === me.id` per route — a
// missed check is a security hole.
export async function requireHost(partyId: string, userId: string) {
  const party = await prisma.partyPlan.findUnique({
    where: { id: partyId },
    select: { id: true, authorId: true, startsAt: true, status: true },
  });
  if (!party || party.authorId !== userId) return null;
  return party;
}

// Membership check for features any party member may use (suggest game/cocktail).
// Host counts as a member. Returns { isHost, isMember }.
export async function getPartyMembership(partyId: string, userId: string) {
  const party = await prisma.partyPlan.findUnique({
    where: { id: partyId },
    select: {
      authorId: true,
      invites: { where: { invitedUserId: userId }, select: { id: true }, take: 1 },
    },
  });
  if (!party) return { isHost: false, isMember: false };
  const isHost = party.authorId === userId;
  return { isHost, isMember: isHost || party.invites.length > 0 };
}

// Light selects for the party-page suggestion lists — deliberately NO Decimal
// (drink.abv) or heavy relations, so the payload serializes cleanly across the
// RSC boundary and renders as compact rows (not full EntryCards).
const suggesterSelect = {
  select: { profile: { select: { username: true, displayName: true } } },
} as const;

export async function getPartyDetail(id: string) {
  return prisma.partyPlan.findUnique({
    where: { id },
    include: {
      author: authorSelect,
      bar: barSelect,
      invites: inviteSelect,
      drinkSuggestions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          suggestedById: true,
          suggestedBy: suggesterSelect,
          drink: { select: { id: true, name: true, slug: true, category: { select: { name: true } } } },
          cocktail: { select: { id: true, name: true, slug: true, category: true } },
        },
      },
      gameSuggestions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          text: true,
          suggestedById: true,
          suggestedBy: suggesterSelect,
          votes: { select: { userId: true } },
        },
      },
    },
  });
}

// Public preview by invite code (link invites). Returns party + host + who's going.
export async function getPartyByCode(code: string) {
  const invite = await prisma.partyInvite.findUnique({
    where: { code },
    select: {
      id: true,
      rsvp: true,
      expiresAt: true,
      partyPlan: {
        include: {
          author: authorSelect,
          bar: barSelect,
          invites: { where: { rsvp: "GOING" }, select: { id: true } },
        },
      },
    },
  });
  return invite;
}
