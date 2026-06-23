import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/notifications/read → mark all of the viewer's notifications read.
export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: me.id, read: false },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
