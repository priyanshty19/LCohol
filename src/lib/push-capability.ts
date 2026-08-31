export type PushCapability = "available" | "install-required" | "unsupported";

type PushCapabilityInput = {
  appleMobile: boolean;
  standalone: boolean;
  serviceWorkerAvailable: boolean;
  notificationAvailable: boolean;
  vapidConfigured: boolean;
};

export function resolvePushCapability({
  appleMobile,
  standalone,
  serviceWorkerAvailable,
  notificationAvailable,
  vapidConfigured,
}: PushCapabilityInput): PushCapability {
  if (!serviceWorkerAvailable || !vapidConfigured) return "unsupported";

  // Installed web apps can expose PushManager through their service-worker
  // registration even when the browser omits window.Notification or reports a
  // desktop-style user agent. Treat standalone mode as the strongest signal;
  // subscribe() remains the final, authoritative platform check.
  if (standalone) return "available";

  if (appleMobile) {
    // iOS exposes Web Push only to Home Screen apps. Some WebKit releases do
    // not expose window.Notification even though the installed app can create
    // a subscription through ServiceWorkerRegistration.pushManager.
    return "install-required";
  }

  return notificationAvailable ? "available" : "unsupported";
}
