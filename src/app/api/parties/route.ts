import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getPartiesFor } from "@/lib/parties";
import { Occasion, BudgetRange } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const OCCASIONS = new Set(Object.values(Occasion));
const BUDGETS = new Set(Object.values(BudgetRange));

// GET /api/parties → parties I host + parties I'm invited to.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await getPartiesFor(me.id) });
}

// POST /api/parties → create a party plan.
export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return NextResponse.json({ error: "Give your party a name." }, { status: 400 });

  // Venue: a listed bar OR a free-text location (one or the other).
  let barId: string | null = null;
  if (typeof body.barId === "string" && body.barId) {
    const bar = await prisma.bar.findUnique({ where: { id: body.barId }, select: { id: true } });
    barId = bar?.id ?? null;
  }
  const locationText =
    !barId && typeof body.locationText === "string" ? body.locationText.trim().slice(0, 200) || null : null;

  const party = await prisma.partyPlan.create({
    data: {
      authorId: me.id,
      title,
      description: typeof body.description === "string" ? body.description.slice(0, 2000) : null,
      occasion: OCCASIONS.has(body.occasion) ? (body.occasion as Occasion) : null,
      budget: BUDGETS.has(body.budget) ? (body.budget as BudgetRange) : null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      barId,
      locationText,
    },
    select: { id: true },
  });

  return NextResponse.json({ data: { id: party.id } }, { status: 201 });
}
