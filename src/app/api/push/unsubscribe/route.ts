import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Remove a Web Push subscription (this browser stopped receiving notifications).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await request.json().catch(() => ({}));
  if (endpoint) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  }
  return NextResponse.json({ ok: true });
}
