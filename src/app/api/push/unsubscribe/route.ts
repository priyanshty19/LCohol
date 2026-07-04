import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";

// Remove a Web Push subscription (this browser stopped receiving notifications).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!(await rateLimit(`push-unsub:${user.id}`, 20, 60_000))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.slice(0, 1024) : "";

  try {
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isPoolExhausted(err)) {
      console.warn("[api/push/unsubscribe] pool exhausted — 503 backoff");
      return poolBusyResponse();
    }
    console.error("[api/push/unsubscribe]", err);
    return NextResponse.json({ error: "Couldn't unsubscribe." }, { status: 500 });
  }
}
