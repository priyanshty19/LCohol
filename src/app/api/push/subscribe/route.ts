import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Save (or re-bind) a browser Web Push subscription to the current user. Keyed by
// the unique endpoint, so re-subscribing the same browser just updates it.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subscription, userAgent } = await request.json().catch(() => ({}));
  const endpoint = subscription?.endpoint as string | undefined;
  const p256dh = subscription?.keys?.p256dh as string | undefined;
  const auth = subscription?.keys?.auth as string | undefined;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth, userAgent: userAgent ?? null },
    create: { userId: user.id, endpoint, p256dh, auth, userAgent: userAgent ?? null },
  });

  return NextResponse.json({ ok: true });
}
