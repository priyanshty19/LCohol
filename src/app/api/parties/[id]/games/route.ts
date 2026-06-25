import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartyMembership } from "@/lib/parties";

// POST /api/parties/[id]/games  { text }  → any member suggests a game.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isMember } = await getPartyMembership(id, me.id);
  if (!isMember) return NextResponse.json({ error: "Not a member of this party" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 200) : "";
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  const created = await prisma.partyGameSuggestion.create({
    data: { partyPlanId: id, suggestedById: me.id, text },
    select: { id: true },
  });
  return NextResponse.json({ data: { id: created.id } });
}

// DELETE /api/parties/[id]/games  { gameId }  → host OR the suggester removes it.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const gameId = typeof body.gameId === "string" ? body.gameId : null;
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  const game = await prisma.partyGameSuggestion.findFirst({
    where: { id: gameId, partyPlanId: id },
    select: { id: true, suggestedById: true, partyPlan: { select: { authorId: true } } },
  });
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete = game.suggestedById === me.id || game.partyPlan.authorId === me.id;
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.partyGameSuggestion.delete({ where: { id: game.id } });
  return NextResponse.json({ data: { removed: game.id } });
}
