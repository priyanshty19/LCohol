import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id, isDeleted: false },
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

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // A CIRCLE post is readable only by its author or someone in the author's
  // circle. Return the same 404 to non-members so it doesn't leak existence.
  if (post.visibility === "CIRCLE") {
    const me = await getCurrentUser();
    let allowed = false;
    if (me) {
      allowed =
        me.id === post.authorId ||
        (await getConnectionUserIds(me.id)).includes(post.authorId);
    }
    if (!allowed) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ data: post });
}
