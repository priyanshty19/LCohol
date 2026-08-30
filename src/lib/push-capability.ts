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

  if (appleMobile) {
    // iOS exposes Web Push only to Home Screen apps. Some WebKit releases do
    // not expose window.Notification even though the installed app can create
    // a subscription through ServiceWorkerRegistration.pushManager.
    return standalone ? "available" : "install-required";
  }

  return notificationAvailable ? "available" : "unsupported";
}
