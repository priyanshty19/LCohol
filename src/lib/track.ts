import type { InteractionType, TargetType } from "@/generated/prisma/client";

// Client-side fire-and-forget event tracking. Uses sendBeacon so it survives
// navigation and never blocks the UI; falls back to keepalive fetch. Safe to call
// from anywhere in a client component — no-ops on the server.
export function trackEvent(
  interactionType: InteractionType,
  targetType: TargetType,
  opts?: { targetId?: string; context?: Record<string, unknown> },
): void {
  if (typeof navigator === "undefined") return;
  const payload = JSON.stringify({
    interactionType,
    targetType,
    targetId: opts?.targetId,
    context: opts?.context,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/interactions", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    /* ignore */
  }
}
