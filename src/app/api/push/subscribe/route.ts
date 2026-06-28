import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

const SUBSCRIBE_LIMIT_PER_MIN = 10;
const MAX_SUBSCRIPTIONS_PER_USER = 20;

// Save (or re-bind) a browser Web Push subscription to the current user. Keyed by
// the unique endpoint, so re-subscribing the same browser just updates it.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!rateLimit(`push-sub:${user.id}`, SUBSCRIBE_LIMIT_PER_MIN, 60_000)) {
    return NextResponse.json(
      { error: "You're subscribing too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const { subscription, userAgent } = await request.json().catch(() => ({}));
  const endpoint =
    typeof subscription?.endpoint === "string" ? subscription.endpoint.slice(0, 1024) : undefined;
  const p256dh =
    typeof subscription?.keys?.p256dh === "string" ? subscription.keys.p256dh.slice(0, 512) : undefined;
  const auth =
    typeof subscription?.keys?.auth === "string" ? subscription.keys.auth.slice(0, 512) : undefined;
  const ua = typeof userAgent === "string" ? userAgent.slice(0, 512) : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  try {
    const subCount = await prisma.pushSubscription.count({ where: { userId: user.id } });
    if (subCount >= MAX_SUBSCRIPTIONS_PER_USER) {
      return NextResponse.json(
        { error: `You've reached the ${MAX_SUBSCRIPTIONS_PER_USER}-device limit. Remove some to add more.` },
        { status: 409 },
      );
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: user.id, p256dh, auth, userAgent: ua },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent: ua },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/push/subscribe] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/push/subscribe]", err);
    return NextResponse.json({ error: "Couldn't save subscription." }, { status: 500 });
  }
}
