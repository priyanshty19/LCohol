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

  const wantPosts = type === "all" || type === "posts";
  const wantDrinks = type === "all" || type === "drinks";
  const wantUsers = type === "all" || type === "users";

  // Kick off the independent queries immediately so type=all runs them in
  // parallel (was three sequential awaits = sum of all three latencies).
  const drinksPromise = wantDrinks
    ? prisma.drink.findMany({
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
      })
    : undefined;

  const profilesPromise = wantUsers
    ? prisma.profile.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: SEARCH_PAGE_SIZE,
        select: { username: true, displayName: true, avatarUrl: true, shots: true, bio: true },
      })
    : undefined;

  // Posts need the searcher's audience first (auth + circle), computed inline so
  // the drinks/profiles queries above keep running concurrently.
  const postsPromise = wantPosts
    ? (async () => {
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
        return prisma.post.findMany({
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
                profile: { select: { username: true, displayName: true, avatarUrl: true } },
              },
            },
            tags: { include: { tag: true } },
            drinks: {
              include: { drink: { select: { id: true, name: true, slug: true, imageUrl: true } } },
            },
            _count: { select: { comments: true, votes: true } },
          },
        });
      })()
    : undefined;

  const [posts, drinks, profiles] = await Promise.all([postsPromise, drinksPromise, profilesPromise]);

  const results: { posts?: unknown[]; drinks?: unknown[]; profiles?: unknown[] } = {};
  if (posts) results.posts = posts;
  if (drinks) results.drinks = drinks;
  if (profiles) results.profiles = profiles;

  return NextResponse.json(results);
}
