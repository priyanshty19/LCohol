export type PushCapability =
  | "available"
  | "install-required"
  | "reinstall-required"
  | "unsupported";

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
  if (!vapidConfigured) return "unsupported";

  // A Home Screen icon created before the site advertised itself as a proper
  // web app can still open without Safari chrome, but WebKit does not grant it
  // Service Worker / Web Push capabilities. Existing icons are not upgraded in
  // place, so the only reliable recovery is a fresh Home Screen installation.
  if (appleMobile && standalone && !serviceWorkerAvailable) {
    return "reinstall-required";
  }

  if (!serviceWorkerAvailable) return "unsupported";

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
