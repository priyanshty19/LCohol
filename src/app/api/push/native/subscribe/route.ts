import { NextResponse } from "next/server";
import { isApnsConfigured } from "@/lib/apns";
import { getCurrentUser } from "@/lib/auth";
import { isPoolExhausted, poolBusyResponse } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { nativeIosPushEnabled, normalizeNativeDeviceToken } from "@/lib/native-push";

const SUBSCRIBE_LIMIT_PER_MIN = 10;
const MAX_NATIVE_DEVICES_PER_USER = 20;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBanned) return NextResponse.json({ error: "Account suspended" }, { status: 403 });

  if (!(await rateLimit(`native-push-sub:${user.id}`, SUBSCRIBE_LIMIT_PER_MIN, 60_000))) {
    return NextResponse.json(
      { error: "You're subscribing too fast. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  if (!nativeIosPushEnabled() || !isApnsConfigured()) {
    return NextResponse.json(
      { error: "Native iPhone notifications are not released on this environment yet." },
      { status: 503 },
    );
  }

  const payload = await request.json().catch(() => ({}));
  const deviceToken = normalizeNativeDeviceToken(payload.deviceToken);
  if (!deviceToken || payload.platform !== "ios") {
    return NextResponse.json({ error: "Invalid native push subscription" }, { status: 400 });
  }

  try {
    const existing = await prisma.nativePushSubscription.findUnique({ where: { deviceToken } });
    if (!existing) {
      const count = await prisma.nativePushSubscription.count({ where: { userId: user.id } });
      if (count >= MAX_NATIVE_DEVICES_PER_USER) {
        return NextResponse.json(
          { error: `You've reached the ${MAX_NATIVE_DEVICES_PER_USER}-device limit.` },
          { status: 409 },
        );
      }
    }

    await prisma.nativePushSubscription.upsert({
      where: { deviceToken },
      update: { userId: user.id, platform: "ios" },
      create: { userId: user.id, deviceToken, platform: "ios" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/push/native/subscribe]", error);
    return NextResponse.json({ error: "Couldn't save this iPhone for push notifications." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json().catch(() => ({}));
  const deviceToken = normalizeNativeDeviceToken(payload.deviceToken);
  if (!deviceToken) return NextResponse.json({ error: "Invalid device token" }, { status: 400 });

  try {
    await prisma.nativePushSubscription.deleteMany({ where: { userId: user.id, deviceToken } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isPoolExhausted(error)) return poolBusyResponse();
    console.error("[api/push/native/subscribe DELETE]", error);
    return NextResponse.json({ error: "Couldn't remove this iPhone." }, { status: 500 });
  }
}
