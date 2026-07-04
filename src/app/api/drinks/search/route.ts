import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

export async function GET(request: Request) {
  // Typeahead over unindexed ILIKE — throttle per IP and bound the term.
  if (!(await rateLimit(`drinks-search:${clientIp(request)}`, 30, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "30" } },
    );
  }

  const { searchParams } = new URL(request.url);
  const qRaw = searchParams.get("q");

  if (!qRaw || qRaw.length < 2) {
    return NextResponse.json({ data: [] });
  }
  const q = qRaw.slice(0, 100);

  try {
    const drinks = await prisma.drink.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        brand: true,
        imageUrl: true,
        category: { select: { name: true } },
      },
    });

    return NextResponse.json({ data: drinks });
  } catch (err) {
    if (isPoolExhausted(err)) return poolBusyResponse();
    console.error("[api/drinks/search GET]", err);
    return NextResponse.json({ error: "Couldn't search drinks." }, { status: 500 });
  }
}
