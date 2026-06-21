import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { SEARCH_PAGE_SIZE } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const type = searchParams.get("type") || "all";

  if (!q || q.length < 2) {
    return NextResponse.json({ posts: [], drinks: [], profiles: [] });
  }

  const results: { posts?: any[]; drinks?: any[]; profiles?: any[] } = {};

  if (type === "all" || type === "posts") {
    // Only surface posts the searcher is allowed to see (PUBLIC + own/circle).
    const me = await getCurrentUser();
    const audience: Prisma.PostWhereInput = me
      ? {
          OR: [
            { visibility: "PUBLIC" },
            {
              visibility: "CIRCLE",
              authorId: { in: [me.id, ...(await getConnectionUserIds(me.id))] },
            },
          ],
        }
      : { visibility: "PUBLIC" };

    results.posts = await prisma.post.findMany({
      where: {
        isDeleted: false,
        AND: [
          {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          },
          audience,
        ],
      },
      take: SEARCH_PAGE_SIZE,
      orderBy: { score: "desc" },
      include: {
        author: {
          select: {
            profile: {
              select: { username: true, displayName: true, avatarUrl: true },
            },
          },
        },
        tags: { include: { tag: true } },
        drinks: {
          include: {
            drink: { select: { id: true, name: true, slug: true, imageUrl: true } },
          },
        },
        _count: { select: { comments: true, votes: true } },
      },
    });
  }

  if (type === "all" || type === "drinks") {
    results.drinks = await prisma.drink.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: SEARCH_PAGE_SIZE,
      include: {
        category: true,
        subcategory: true,
        _count: { select: { reviews: true, posts: true } },
      },
    });
  }

  if (type === "all" || type === "users") {
    results.profiles = await prisma.profile.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: SEARCH_PAGE_SIZE,
      select: {
        username: true,
        displayName: true,
        avatarUrl: true,
        shots: true,
        bio: true,
      },
    });
  }

  return NextResponse.json(results);
}
