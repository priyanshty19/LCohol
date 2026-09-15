import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { areConnected } from "@/lib/connections";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  if (!(await rateLimit(`cocktail-cheer:${me.id}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "You're cheering too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { id: cocktailId } = await params;
  try {
    const cocktail = await prisma.cocktailCreation.findUnique({
      where: { id: cocktailId },
      select: { authorId: true, slug: true, isPublic: true },
    });
    if (!cocktail) return NextResponse.json({ error: "Cocktail not found" }, { status: 404 });
    if (cocktail.authorId === me.id) {
      return NextResponse.json({ error: "You can't cheer your own mix." }, { status: 400 });
    }
    if (!cocktail.isPublic && !(await areConnected(me.id, cocktail.authorId))) {
      return NextResponse.json({ error: "Cocktail not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM cocktail_creations WHERE id = ${cocktailId}::uuid FOR UPDATE`;
      const existing = await tx.cocktailCheer.findUnique({
        where: { userId_cocktailId: { userId: me.id, cocktailId } },
      });
      if (existing) {
        await tx.cocktailCheer.delete({ where: { id: existing.id } });
      } else {
        await tx.cocktailCheer.create({ data: { userId: me.id, cocktailId } });
      }
      return {
        cheered: !existing,
        count: await tx.cocktailCheer.count({ where: { cocktailId } }),
      };
    });

    revalidatePath(`/cocktails/${cocktail.slug}`);
    revalidatePath("/cocktails/mine");
    return NextResponse.json({ data: result }, { status: result.cheered ? 201 : 200 });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/cocktails/[id]/cheer]", error);
    return NextResponse.json({ error: "Couldn't record your cheer." }, { status: 500 });
  }
}
