import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { cocktailSelect } from "@/lib/cocktails";

// GET /api/cocktails/mine → the signed-in user's saved mixes (newest first).
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cocktails = await prisma.cocktailCreation.findMany({
    where: { authorId: me.id, isCurated: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: cocktailSelect,
  });
  return NextResponse.json({ data: { cocktails } });
}
