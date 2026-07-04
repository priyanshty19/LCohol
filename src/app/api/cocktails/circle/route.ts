import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { cocktailSelect } from "@/lib/cocktails";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// GET /api/cocktails/circle → mixes invented by the viewer's circle, highest
// scored first (ties → newest). Powers the "Loved by your circle" sections on
// the Cocktails tab and Mix Lab. Empty circle → empty list (section hides).
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const circleIds = await getConnectionUserIds(me.id);
    if (!circleIds.length) return NextResponse.json({ data: { cocktails: [] } });

    const cocktails = await prisma.cocktailCreation.findMany({
      where: { authorId: { in: circleIds }, isCurated: false },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 12,
      select: {
        ...cocktailSelect,
        author: {
          select: { profile: { select: { username: true } } },
        },
      },
    });
    return NextResponse.json({ data: { cocktails } });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/cocktails/circle] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/cocktails/circle]", err);
    return NextResponse.json({ error: "Couldn't load circle mixes." }, { status: 500 });
  }
}
