import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartyMembership } from "@/lib/parties";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// POST /api/parties/[id]/games/vote  { gameId }  → toggle this member's upvote.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!(await rateLimit(`game-vote:${me.id}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "You're voting too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { isMember } = await getPartyMembership(id, me.id);
  if (!isMember) return NextResponse.json({ error: "Not a member of this party" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const gameId = typeof body.gameId === "string" ? body.gameId : null;
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  // Scope to this party so a member can't vote on another party's game.
  const game = await prisma.partyGameSuggestion.findFirst({
    where: { id: gameId, partyPlanId: id },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.partyGameVote.findUnique({
    where: { gameSuggestionId_userId: { gameSuggestionId: gameId, userId: me.id } },
    select: { gameSuggestionId: true },
  });

  if (existing) {
    await prisma.partyGameVote.delete({
      where: { gameSuggestionId_userId: { gameSuggestionId: gameId, userId: me.id } },
    });
    return NextResponse.json({ data: { voted: false } });
  }
  try {
    await prisma.partyGameVote.create({ data: { gameSuggestionId: gameId, userId: me.id } });
  } catch {
    // Race: a concurrent request already recorded this member's vote. The
    // composite PK makes that safe to treat as already-voted.
  }
  return NextResponse.json({ data: { voted: true } });
}
