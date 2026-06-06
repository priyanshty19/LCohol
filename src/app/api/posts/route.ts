import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { FEED_PAGE_SIZE } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sort = searchParams.get("sort") || "new";
  const cursor = searchParams.get("cursor");
  const postType = searchParams.get("type");

  const where = {
    isDeleted: false,
    ...(postType ? { postType: postType as any } : {}),
  };

  const orderBy =
    sort === "hot"
      ? [{ score: "desc" as const }, { createdAt: "desc" as const }]
      : sort === "top"
        ? [{ score: "desc" as const }]
        : [{ createdAt: "desc" as const }];

  const posts = await prisma.post.findMany({
    where,
    orderBy,
    take: FEED_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

  const hasMore = posts.length > FEED_PAGE_SIZE;
  const data = hasMore ? posts.slice(0, FEED_PAGE_SIZE) : posts;

  return NextResponse.json({
    data,
    hasMore,
    nextCursor: hasMore ? data[data.length - 1]?.id : undefined,
  });
}

export async function POST(request: Request) {
  const dbUser = await getCurrentUser();

  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, body: postBody, postType, tagIds, drinkIds } = body;

  if (!title || !postType) {
    return NextResponse.json(
      { error: "Title and post type are required" },
      { status: 400 }
    );
  }

  const post = await prisma.post.create({
    data: {
      authorId: dbUser.id,
      title,
      body: postBody || null,
      postType,
      tags: tagIds?.length
        ? { create: tagIds.map((id: string) => ({ tagId: id })) }
        : undefined,
      drinks: drinkIds?.length
        ? { create: drinkIds.map((id: string) => ({ drinkId: id })) }
        : undefined,
    },
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

  return NextResponse.json({ data: post }, { status: 201 });
}
