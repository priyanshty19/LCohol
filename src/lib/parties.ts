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
  const [hosting, invited] = await Promise.all([
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
  ]);
  return { hosting, invited };
}

export async function getPartyDetail(id: string) {
  return prisma.partyPlan.findUnique({
    where: { id },
    include: {
      author: authorSelect,
      bar: barSelect,
      invites: inviteSelect,
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
