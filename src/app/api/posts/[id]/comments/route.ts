import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { COMMENTS_PAGE_SIZE } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const comments = await prisma.comment.findMany({
    where: { postId, parentId: null, isDeleted: false },
    orderBy: { score: "desc" },
    take: COMMENTS_PAGE_SIZE,
    include: {
      author: {
        select: {
          profile: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      replies: {
        where: { isDeleted: false },
        orderBy: { score: "desc" },
        take: 5,
        include: {
          author: {
            select: {
              profile: {
                select: { username: true, displayName: true, avatarUrl: true },
              },
            },
          },
          _count: { select: { replies: true } },
        },
      },
      _count: { select: { replies: true } },
    },
  });

  return NextResponse.json({ data: comments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const dbUser = await getCurrentUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, parentId } = await request.json();

  if (!body || body.trim().length === 0) {
    return NextResponse.json(
      { error: "Comment body is required" },
      { status: 400 }
    );
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      authorId: dbUser.id,
      body: body.trim(),
      parentId: parentId || null,
    },
    include: {
      author: {
        select: {
          profile: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      },
      _count: { select: { replies: true } },
    },
  });

  return NextResponse.json({ data: comment }, { status: 201 });
}
