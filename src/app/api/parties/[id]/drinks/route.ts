import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartyMembership } from "@/lib/parties";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

const SUGGEST_LIMIT_PER_MIN = 15;
const MAX_DRINKS_PER_PARTY = 100;

// POST /api/parties/[id]/drinks  { kind: "drink"|"cocktail", id }
//   Any party member suggests a drink or cocktail for the party.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!rateLimit(`party-drink:${me.id}`, SUGGEST_LIMIT_PER_MIN, 60_000)) {
    return NextResponse.json(
      { error: "You're suggesting drinks too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { isMember } = await getPartyMembership(id, me.id);
  if (!isMember) return NextResponse.json({ error: "Not a member of this party" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "drink" || body.kind === "cocktail" ? body.kind : null;
  const refId = typeof body.id === "string" ? body.id.slice(0, 200) : null;
  if (!kind || !refId) {
    return NextResponse.json({ error: "kind ('drink'|'cocktail') and id required" }, { status: 400 });
  }

  try {
    // Hard ceiling on suggestions per party — caps row spam even past the limiter.
    const drinkCount = await prisma.partyDrinkSuggestion.count({ where: { partyPlanId: id } });
    if (drinkCount >= MAX_DRINKS_PER_PARTY) {
      return NextResponse.json(
        { error: `This party has reached the ${MAX_DRINKS_PER_PARTY}-drink limit.` },
        { status: 409 },
      );
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
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/parties/drinks] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/parties/drinks]", err);
    return NextResponse.json({ error: "Couldn't add the drink." }, { status: 500 });
  }
}

// DELETE /api/parties/[id]/drinks  { suggestionId }
//   The host OR the member who suggested it may remove a suggestion.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!rateLimit(`party-drink-delete:${me.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const suggestionId = typeof body.suggestionId === "string" ? body.suggestionId : null;
  if (!suggestionId) return NextResponse.json({ error: "suggestionId required" }, { status: 400 });

  try {
    const suggestion = await prisma.partyDrinkSuggestion.findFirst({
      where: { id: suggestionId, partyPlanId: id },
      select: { id: true, suggestedById: true, partyPlan: { select: { authorId: true } } },
    });
    if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canDelete = suggestion.suggestedById === me.id || suggestion.partyPlan.authorId === me.id;
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.partyDrinkSuggestion.delete({ where: { id: suggestion.id } });
    return NextResponse.json({ data: { removed: suggestion.id } });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/parties/[id]/drinks DELETE]", err);
    return NextResponse.json({ error: "Couldn't remove suggestion." }, { status: 500 });
  }
}
