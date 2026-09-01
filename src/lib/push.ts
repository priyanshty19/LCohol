import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { sendNativePush } from "@/lib/apns";

// Web Push sender. VAPID keys are self-generated (see .env.local). If they're not
// set, push is a silent no-op so the app still runs (e.g. in CI / before setup).

const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:notifications@sipstories.app";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// Push to every device the user has subscribed. Best-effort: a failed send never
// throws; subscriptions the push service reports as gone (404/410) are pruned.
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  const nativeDelivery = sendNativePush(userId, payload);
  if (!ensureConfigured()) {
    await nativeDelivery;
    return;
  }
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) {
    await nativeDelivery;
    return;
  }

  const data = JSON.stringify(payload);
  await Promise.all([
    nativeDelivery,
    ...subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        } else {
          console.error("[sendPush]", code, (e as { body?: string })?.body ?? e);
        }
      }
    }),
  ]);
}
