import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartyMembership } from "@/lib/parties";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

const SUGGEST_LIMIT_PER_MIN = 10;
const MAX_SUGGESTIONS_PER_PARTY = 20;

// POST /api/parties/[id]/games  { text }  → any member suggests a game.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!(await rateLimit(`party-game:${me.id}`, SUGGEST_LIMIT_PER_MIN, 60_000))) {
    return NextResponse.json(
      { error: "You're suggesting games too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { isMember } = await getPartyMembership(id, me.id);
  if (!isMember) return NextResponse.json({ error: "Not a member of this party" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 200) : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  try {
    const suggestionCount = await prisma.partyGameSuggestion.count({
      where: { partyPlanId: id, suggestedById: me.id },
    });
    if (suggestionCount >= MAX_SUGGESTIONS_PER_PARTY) {
      return NextResponse.json(
        { error: `You've reached the ${MAX_SUGGESTIONS_PER_PARTY}-suggestion limit for this party.` },
        { status: 409 },
      );
    }

    const created = await prisma.partyGameSuggestion.create({
      data: { partyPlanId: id, suggestedById: me.id, text },
      select: { id: true },
    });
    return NextResponse.json({ data: { id: created.id } });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/parties/games] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/parties/games]", err);
    return NextResponse.json({ error: "Couldn't save your suggestion." }, { status: 500 });
  }
}

// DELETE /api/parties/[id]/games  { gameId }  → host OR the suggester removes it.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!(await rateLimit(`party-game-delete:${me.id}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const gameId = typeof body.gameId === "string" ? body.gameId : null;
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  try {
    const game = await prisma.partyGameSuggestion.findFirst({
      where: { id: gameId, partyPlanId: id },
      select: { id: true, suggestedById: true, partyPlan: { select: { authorId: true } } },
    });
    if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canDelete = game.suggestedById === me.id || game.partyPlan.authorId === me.id;
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.partyGameSuggestion.delete({ where: { id: game.id } });
    return NextResponse.json({ data: { removed: game.id } });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/parties/[id]/games DELETE]", err);
    return NextResponse.json({ error: "Couldn't remove suggestion." }, { status: 500 });
  }
}
