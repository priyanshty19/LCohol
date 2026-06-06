import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  const dbUser = await getCurrentUser();
  if (!dbUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { value } = await request.json();

  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  const existing = await prisma.vote.findUnique({
    where: { userId_postId: { userId: dbUser.id, postId } },
  });

  if (existing) {
    if (existing.value === value) {
      await prisma.$transaction([
        prisma.vote.delete({ where: { id: existing.id } }),
        prisma.post.update({
          where: { id: postId },
          data: { score: { decrement: value } },
        }),
      ]);
      return NextResponse.json({ data: { vote: null } });
    } else {
      await prisma.$transaction([
        prisma.vote.update({ where: { id: existing.id }, data: { value } }),
        prisma.post.update({
          where: { id: postId },
          data: { score: { increment: value * 2 } },
        }),
      ]);
      return NextResponse.json({ data: { vote: value } });
    }
  }

  await prisma.$transaction([
    prisma.vote.create({
      data: { userId: dbUser.id, postId, value },
    }),
    prisma.post.update({
      where: { id: postId },
      data: { score: { increment: value } },
    }),
  ]);

  return NextResponse.json({ data: { vote: value } }, { status: 201 });
}
