import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getConnectionUserIds } from "@/lib/connections";
import { notify, notifyMany } from "@/lib/notifications";
import { recomputeKarma } from "@/lib/karma";

// POST /api/posts/[id]/share
//   { mode: "circle" }                     → re-share to your circle's feed
//   { mode: "send", toUserIds: string[] }  → send to specific circle members
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const post = await prisma.post.findFirst({
    where: { id, isDeleted: false },
    select: { id: true, authorId: true, visibility: true },
  });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Authorization: you can only share a post you can actually see. A CIRCLE post
  // is visible only to its author and the author's circle — mirror the read rule
  // so sharing can't leak a restricted post (or its existence via notifications).
  if (post.visibility === "CIRCLE" && post.authorId !== me.id) {
    const authorCircle = await getConnectionUserIds(post.authorId);
    if (!authorCircle.includes(me.id)) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "send" ? "send" : "circle";

  if (mode === "circle") {
    const note = typeof body.note === "string" ? body.note.slice(0, 280) : null;
    await prisma.postShare.upsert({
      where: { postId_sharerId: { postId: id, sharerId: me.id } },
      create: { postId: id, sharerId: me.id, note },
      update: { note },
    });
    await notify({ userId: post.authorId, actorId: me.id, type: "SHARE", postId: id });
    await recomputeKarma(me.id);
    return NextResponse.json({ data: { shared: true } }, { status: 201 });
  }

  // send: recipients must be in the sharer's circle
  const requested: string[] = Array.isArray(body.toUserIds)
    ? body.toUserIds.filter((x: unknown): x is string => typeof x === "string")
    : [];
  if (!requested.length) {
    return NextResponse.json({ error: "Pick at least one person." }, { status: 400 });
  }
  const circle = new Set(await getConnectionUserIds(me.id));
  const valid = requested.filter((uid) => circle.has(uid));
  if (!valid.length) {
    return NextResponse.json({ error: "You can only send to people in your circle." }, { status: 400 });
  }

  await prisma.postSend.createMany({
    data: valid.map((toUserId) => ({ postId: id, fromUserId: me.id, toUserId })),
  });
  await notifyMany(valid, { actorId: me.id, type: "SEND", postId: id });

  return NextResponse.json({ data: { sent: valid.length } }, { status: 201 });
}
