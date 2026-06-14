import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const { slug } = await params;
  const { rating, body } = await request.json();
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "Rating must be 1–5." }, { status: 400 });
  }

  const bar = await prisma.bar.findUnique({ where: { slug }, select: { id: true } });
  if (!bar) return NextResponse.json({ error: "Bar not found." }, { status: 404 });

  const review = await prisma.barReview.upsert({
    where: { barId_authorId: { barId: bar.id, authorId: user.id } },
    update: { rating: r, body: body ?? null },
    create: { barId: bar.id, authorId: user.id, rating: r, body: body ?? null },
  });

  return NextResponse.json({ data: review }, { status: 201 });
}
