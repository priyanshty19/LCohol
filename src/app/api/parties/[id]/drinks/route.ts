import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartyMembership } from "@/lib/parties";

// POST /api/parties/[id]/drinks  { kind: "drink"|"cocktail", id }
//   Any party member suggests a drink or cocktail for the party.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isMember } = await getPartyMembership(id, me.id);
  if (!isMember) return NextResponse.json({ error: "Not a member of this party" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "drink" || body.kind === "cocktail" ? body.kind : null;
  const refId = typeof body.id === "string" ? body.id : null;
  if (!kind || !refId) {
    return NextResponse.json({ error: "kind ('drink'|'cocktail') and id required" }, { status: 400 });
  }

  // Verify the referenced item exists (avoids a raw FK violation → 500).
  const exists =
    kind === "drink"
      ? await prisma.drink.findUnique({ where: { id: refId }, select: { id: true } })
      : await prisma.cocktailCreation.findUnique({ where: { id: refId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Skip duplicates (same item already suggested for this party).
  const dupe = await prisma.partyDrinkSuggestion.findFirst({
    where: {
      partyPlanId: id,
      ...(kind === "drink" ? { drinkId: refId } : { cocktailId: refId }),
    },
    select: { id: true },
  });
  if (dupe) return NextResponse.json({ data: { id: dupe.id, duplicate: true } });

  const created = await prisma.partyDrinkSuggestion.create({
    data: {
      partyPlanId: id,
      suggestedById: me.id,
      ...(kind === "drink" ? { drinkId: refId } : { cocktailId: refId }),
    },
    select: { id: true },
  });
  return NextResponse.json({ data: { id: created.id } });
}

// DELETE /api/parties/[id]/drinks  { suggestionId }
//   The host OR the member who suggested it may remove a suggestion.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const suggestionId = typeof body.suggestionId === "string" ? body.suggestionId : null;
  if (!suggestionId) return NextResponse.json({ error: "suggestionId required" }, { status: 400 });

  const suggestion = await prisma.partyDrinkSuggestion.findFirst({
    where: { id: suggestionId, partyPlanId: id },
    select: { id: true, suggestedById: true, partyPlan: { select: { authorId: true } } },
  });
  if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete = suggestion.suggestedById === me.id || suggestion.partyPlan.authorId === me.id;
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.partyDrinkSuggestion.delete({ where: { id: suggestion.id } });
  return NextResponse.json({ data: { removed: suggestion.id } });
}
